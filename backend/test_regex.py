import sqlite3, re

conn = sqlite3.connect('data/app.db')
c = conn.cursor()
c.execute('SELECT raw_content FROM novels WHERE id=3')
content = c.fetchone()[0]

# Same regex as parse_chapters
pattern = r'(?:^|\n)\s*(?:#{1,6}\s+)?(第\s*[\d零一二三四五六七八九十百千]+\s*[章回节卷集])\s*[:：]?\s*([^\n]*)'
matches = list(re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE))

print(f"Total matches: {len(matches)}")

# Simulate the chapter parsing logic
chapters = []
last_pos = 0
last_title = ""

for i, match in enumerate(matches):
    start_pos = match.start()
    chapter_num = match.group(1).strip()
    title_part = match.group(2).strip()
    if title_part:
        current_title = f"{chapter_num}: {title_part}"
    else:
        current_title = chapter_num
    
    if i > 0:
        chapter_content = content[last_pos:start_pos].strip()
        if chapter_content:
            chapters.append({"title": last_title, "content_len": len(chapter_content), "content_preview": chapter_content[:50]})
        else:
            print(f"EMPTY chapter at i={i}, title would be: {last_title}")
    
    last_title = current_title
    last_pos = match.end()

# Last chapter
if last_pos < len(content):
    chapter_content = content[last_pos:].strip()
    if chapter_content:
        chapters.append({"title": last_title, "content_len": len(chapter_content), "content_preview": chapter_content[:50]})

print(f"\nTotal chapters parsed: {len(chapters)}")
print(f"\nFirst 5 chapters:")
for i, ch in enumerate(chapters[:5]):
    print(f"  [{i}] {ch['title']} (len={ch['content_len']}): {ch['content_preview']}...")

conn.close()
