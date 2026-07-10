import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'data', 'app.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Check if column already exists
c.execute("PRAGMA table_info(storyboards)")
columns = [row[1] for row in c.fetchall()]

if 'style_prompt' not in columns:
    c.execute("ALTER TABLE storyboards ADD COLUMN style_prompt TEXT DEFAULT ''")
    conn.commit()
    print("Added style_prompt column to storyboards table")
else:
    print("style_prompt column already exists")

conn.close()
