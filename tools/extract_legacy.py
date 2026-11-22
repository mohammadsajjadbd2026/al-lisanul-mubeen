"""পুরোনো দুই কোর্স (হাতেখড়ি, নাহু) থেকে দরসগুলো বের করে courses/legacy/*.json তৈরি করে।
অ্যাডমিন ড্যাশবোর্ডের "পুরোনো কোর্স আমদানি" এই ফাইল /api/admin/legacy দিয়ে পড়ে।
চালান:  python3 tools/extract_legacy.py
"""
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "courses" / "legacy"
OUT.mkdir(parents=True, exist_ok=True)


def strip_tags(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def sections(doc):
    """<section id="..."> … </section> — শীর্ষ স্তরের সেকশনগুলো (ভেতরে নেস্টেড section নেই ধরে নেওয়া)"""
    out = {}
    for m in re.finditer(r'<section([^>]*)\bid="([^"]+)"([^>]*)>(.*?)</section>', doc, re.S):
        out[m.group(2)] = m.group(4)
    return out


def hoist_imports(css, font_url):
    return f"@import url('{font_url}');\n" + css


# ======================= হাতেখড়ি =======================
def hatekhori():
    src = ROOT / "courses" / "hatekhori" / "content.html"   # সুরক্ষিত কপি (প্রকাশ্য site/-এ নেই)
    if not src.exists():
        src = ROOT / "site" / "hatekhori" / "index.html"
    doc = src.read_text(encoding="utf-8")
    css = re.findall(r"<style[^>]*>(.*?)</style>", doc, re.S)[0]
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", doc, re.S)
    secs = sections(doc)
    nav = re.search(r"<nav>(.*?)</nav>", doc, re.S).group(1)

    chapters, cur = [], None
    for m in re.finditer(r'<div class="ch">(.*?)</div>|<a[^>]*data-s="([^"]+)"[^>]*>(.*?)</a>', nav, re.S):
        if m.group(1) is not None:
            title = re.sub(r"\s*✅\s*$", "", strip_tags(m.group(1)))
            cur = {"key": "ch%d" % (len(chapters) + 1), "title": title, "lessons": []}
            chapters.append(cur)
        else:
            sid, label = m.group(2), strip_tags(m.group(3))
            if sid == "home" or cur is None or sid not in secs:
                continue
            body = secs[sid]
            h2 = re.search(r"<h2>(.*?)</h2>", body, re.S)
            title = strip_tags(h2.group(1)) if h2 else label
            has_quiz = 'class="quiz' in body
            cur["lessons"].append({
                "key": sid, "title": title,
                "body_html": f'<section id="{sid}" class="on">{body}</section>',
                "completion": "embedded" if has_quiz else "manual",
            })
    chapters = [c for c in chapters if c["lessons"]]

    # নকশা: পুরোনো পাতার লেআউট (পাশের মেনু, লুকানো সেকশন) ফ্রেমে বন্ধ করে দেওয়া
    theme_css = hoist_imports(css, "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@600;700&display=swap") + """
/* --- LMS ফ্রেমের জন্য সমন্বয় --- */
body{display:block!important;min-height:0!important;background:transparent!important}
main,.lx-body{padding:0!important;max-width:none!important}
section{display:block!important}
section > h2:first-child{display:none}
"""
    letters = scripts[0].split("document.querySelectorAll('nav a')")[0]
    quiz = scripts[1]
    quiz = quiz.replace(
        "if(done===qs.length)sc.textContent=",
        "if(done===qs.length)window.__lxDone&&window.__lxDone();if(done===qs.length)sc.textContent=",
    )
    theme_js = """(function(){
var el=document.getElementById('letters');
if(el){""" + letters.replace("document.getElementById('letters').innerHTML=", "el.innerHTML=") + """}
// সব কুইজের সব প্রশ্নের উত্তর হয়ে গেলে নম্বর জমা হয়
window.__lxDone=function(){
  var all=document.querySelectorAll('.quiz .qq'),done=0,ok=0;
  all.forEach(function(q){if(q.dataset.done){done++;if(q.querySelector('.qo.right[data-ok="1"]')&&!q.querySelector('.qo.wrong'))ok++;}});
  if(all.length&&done===all.length&&window.LMS)LMS.report(Math.round(100*ok/all.length));
};
})();
""" + quiz
    home = secs.get("home", "")
    course = {
        "slug": "arabi-bhashar-hatekhori", "title": "আরবি ভাষার হাতেখড়ি",
        "subtitle": "হরফ ও উচ্চারণ থেকে শব্দ, বাক্য, সহজ ব্যাকরণ — তারপর কুরআনের সূরা, হাদিস ও ছোট গল্প পড়া।",
        "level": "প্রথম ধাপ · একদম শুরু থেকে", "price": 2500, "old_price": 3000, "status": "open", "sort": 1,
        "pass_mark": 70, "sequential": True, "certificate": True,
        "description": re.sub(r"<h2>.*?</h2>", "", home, count=1, flags=re.S).strip(),
        "theme_css": theme_css, "theme_js": theme_js,
    }
    return {"course": course, "chapters": chapters}


# ======================= নাহু =======================
def nahw():
    doc = (ROOT / "site" / "nahw" / "index.html").read_text(encoding="utf-8")
    css = max(re.findall(r"<style[^>]*>(.*?)</style>", doc, re.S), key=len)
    big = max(re.findall(r"<script>(.*?)</script>", doc, re.S), key=len)
    nav = re.search(r'<nav id="side"[^>]*>(.*?)</nav>', doc, re.S).group(1)
    lessons_dir = ROOT / "courses" / "nahw" / "lessons"

    chapters, cur = [], None
    for m in re.finditer(r'<div class="chap">(.*?)</div>|<a href="#([^"]+)" data-go="[^"]+">(.*?)</a>', nav, re.S):
        if m.group(1) is not None:
            cur = {"key": "ch%d" % (len(chapters) + 1), "title": strip_tags(m.group(1)).replace(" · ", ": "), "lessons": []}
            chapters.append(cur)
        else:
            lid = m.group(2)
            f = lessons_dir / f"{lid}.html"
            if cur is None or not f.exists():
                continue
            body = f.read_text(encoding="utf-8")
            title = re.sub(r"^[০-৯]+", "", strip_tags(m.group(3))).strip()
            has_ex = re.search(r'class="ex"[^>]*data-kind=|data-kind="[a-z]+"[^>]*class="ex', body) or 'data-kind=' in body
            cur["lessons"].append({
                "key": lid, "title": title,
                "body_html": f'<section class="page on" id="{lid}" data-lesson>{body}</section>',
                "completion": "embedded" if has_ex else "manual",
            })
    chapters = [c for c in chapters if c["lessons"]]

    # দরসের আচরণ (অনুশীলন, চার্ট, শব্দের অর্থ) — অ্যাকাউন্ট/নেভিগেশন বাদ দিয়ে
    start = big.index("/* ---------- word popover")
    end = big.index("/* ---------- account page")
    components = big[start:end]
    theme_js = r"""(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const bn=n=>String(n).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]);
const PASS=70;
document.body.insertAdjacentHTML('afterbegin','<div id="pop" role="status"></div>');
const root=document.querySelector('.page');
const ORIGINAL=root.innerHTML;
function report(ex,ok,total){ex.dataset.ok=ok;ex.dataset.total=total;updateScore()}
function updateScore(){
  const exs=$$('.ex[data-kind]',root); if(!exs.length) return;
  const body=$('.lscore .ls-body',root); if(!body) return;
  const doneEx=exs.filter(x=>x.dataset.total);
  if(doneEx.length<exs.length){body.innerHTML='<p>'+bn(exs.length)+'টি অনুশীলনের '+bn(doneEx.length)+'টি করা হয়েছে। সবগুলো শেষ করলে ফল দেখাবে।</p>';return}
  const ok=doneEx.reduce((a,x)=>a+ +x.dataset.ok,0), tot=doneEx.reduce((a,x)=>a+ +x.dataset.total,0);
  const pct=Math.round(ok/tot*100), pass=pct>=PASS;
  body.innerHTML='<div class="ls-pct'+(pass?' ok':'')+'">'+bn(pct)+'%</div><p>'+bn(tot)+'টির মধ্যে '+bn(ok)+'টি সঠিক। '+(pass?'মাশাআল্লাহ!':'পাশ করতে কমপক্ষে '+bn(PASS)+'% লাগবে — আবার চেষ্টা করো।')+'</p><button class="btn" data-retry>অনুশীলন আবার করো</button>';
  $('[data-retry]',body).onclick=()=>{mount();window.scrollTo(0,0)};
  if(window.LMS) LMS.report(pct);
}
""" + components + r"""
function mount(){
  root.innerHTML=ORIGINAL;
  const panel=document.createElement('div');panel.className='lscore';panel.innerHTML='<h3>তোমার ফল</h3><div class="ls-body"></div>';
  const qr=$('.qr',root); if(qr) qr.before(panel); else root.appendChild(panel);
  init(root); runCharts(root); updateScore();
}
mount();
})();
"""
    theme_css = hoist_imports(css, "https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&family=Anek+Bangla:wght@400;500;600;700&family=Scheherazade+New:wght@400;700&display=swap") + """
/* --- LMS ফ্রেমের জন্য সমন্বয় --- */
body{display:block!important;min-height:0!important;background:transparent!important}
main,.lx-body{padding:0!important;max-width:none!important;margin:0!important}
.page{display:block!important}
.page > h1.lt:first-child{display:none}
.lfoot{display:none!important}
"""
    course = {
        "slug": "nahwer-sohoj-path", "title": "নাহুর সহজ পাঠ",
        "subtitle": "উদাহরণ দেখে, বিশ্লেষণ করে, তারপর নিয়ম — শব্দ ও তার প্রকার থেকে ই‘রাব চেনা ও বাক্যের ই‘রাব পর্যন্ত।",
        "level": "দ্বিতীয় ধাপ · নতুনদের জন্যও", "price": None, "old_price": None, "status": "open", "sort": 2,
        "pass_mark": 70, "sequential": True, "certificate": True,
        "description": "<p>বাংলা ভাষায় আরবি নাহু, যার শেষ লক্ষ্য ই'রাব ও ই'রাবুল জুমাল। প্রতিটি দরস চলে একই ধারায়: আগে উদাহরণ, তারপর উদাহরণ বিশ্লেষণ, শেষে নিয়ম — আর প্রতি দরসের শেষে অনুশীলন। অনুশীলনে অন্তত ৭০% পেলে পরের দরস খুলে যায়।</p>",
        "theme_css": theme_css, "theme_js": theme_js,
    }
    return {"course": course, "chapters": chapters}


for key, fn in (("hatekhori", hatekhori), ("nahw", nahw)):
    pkg = fn()
    (OUT / f"{key}.json").write_text(json.dumps(pkg, ensure_ascii=False), encoding="utf-8")
    n = sum(len(c["lessons"]) for c in pkg["chapters"])
    emb = sum(1 for c in pkg["chapters"] for l in c["lessons"] if l["completion"] == "embedded")
    print(f"{key}: {len(pkg['chapters'])} chapters, {n} lessons ({emb} with exercises), {round(len(json.dumps(pkg, ensure_ascii=False).encode())/1024)} KB")
    for c in pkg["chapters"]:
        print("  ", c["title"], "—", len(c["lessons"]))
