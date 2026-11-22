"""tools/pages/*.html (মাঝের অংশ) থেকে site/*.html তৈরি করে — হেডার/ফুটার সবখানে এক রকম রাখতে।
প্রতিটি ফাইলের প্রথম লাইন:  <!-- title: পাতার শিরোনাম | script: /assets/js/xxx.js | body: css-class | robots: noindex -->
চালান:  python3 tools/build_pages.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "pages"
OUT = ROOT / "site"

HEAD = """<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — আল-লিসানুল মুবীন</title>
{robots}<meta name="theme-color" content="#7A1F2B">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Noto+Serif+Bengali:wght@400;600;700&family=Hind+Siliguri:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="stylesheet" href="/assets/css/lms.css">
</head>
<body class="{body}">
<a class="screen-reader-text skip-link" href="#main">মূল লেখায় যান</a>
<header class="mb-header">
	<div class="mb-container mb-header__inner">
		<a class="mb-brand" href="/" rel="home">
			<img class="mb-brand__img" src="/assets/img/logo.svg" alt="" width="132" height="46">
			<span class="mb-brand__name">আল-লিসানুল মুবীন</span>
		</a>
		<button class="mb-nav-toggle" type="button" aria-expanded="false" aria-controls="mb-nav">
			<span class="screen-reader-text">মেনু খুলুন</span>
			<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
		</button>
		<nav id="mb-nav" class="mb-nav" aria-label="প্রধান মেনু">
			<ul class="mb-menu">
				<li><a href="/#courses">কোর্স</a></li>
				<li><a href="/#payment">ভর্তি</a></li>
				<li><a href="/verify">সার্টিফিকেট যাচাই</a></li>
			</ul>
			<span class="lx-auth" data-auth-slot><a class="mb-btn mb-btn--outline" href="/learn">প্রবেশ</a></span>
		</nav>
	</div>
</header>
<main id="main">
"""

FOOT = """</main>
<footer class="mb-footer">
	<div class="mb-container mb-footer__inner">
		<span>© <span data-year>২০২৬</span> আল-লিসানুল মুবীন</span>
		<ul class="mb-footer__menu">
			<li><a href="/#courses">কোর্স</a></li>
			<li><a href="/learn">আমার কোর্স</a></li>
			<li><a href="/verify">সার্টিফিকেট যাচাই</a></li>
		</ul>
	</div>
</footer>
<script src="/assets/js/config.js"></script>
<script type="module" src="{script}"></script>
</body>
</html>
"""

for src in sorted(SRC.glob("*.html")):
    text = src.read_text(encoding="utf-8")
    first, body = text.split("\n", 1)
    meta = dict(
        (k.strip(), v.strip())
        for k, v in (part.split(":", 1) for part in re.sub(r"^<!--|-->$", "", first.strip()).split("|"))
    )
    robots = '<meta name="robots" content="noindex">\n' if meta.get("robots") == "noindex" else ""
    html = HEAD.format(title=meta["title"], robots=robots, body=meta.get("body", "")) + body + FOOT.format(script=meta["script"])
    (OUT / src.name).write_text(html, encoding="utf-8")
    print("built", src.name)
