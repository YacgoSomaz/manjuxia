import re
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)
from database.db import get_db
from models.novels import NovelCreate, ChapterCreate, ChapterUpdate
from utils.timezone import now_beijing_str
from services import team_context_service as team_ctx
from services import cloud_token_service as cloud_token


class NovelService:
    @staticmethod
    async def ensure_owner_columns(db) -> None:
        """Ensure local account ownership columns exist on novels."""
        cur = await db.execute("PRAGMA table_info(novels)")
        existing = {row[1] for row in await cur.fetchall()}
        for name, spec in (
            ("owner_user_id", "TEXT DEFAULT NULL"),
            ("owner_team_id", "TEXT DEFAULT NULL"),
            ("owner_seat_id", "TEXT DEFAULT NULL"),
        ):
            if name not in existing:
                await db.execute(f"ALTER TABLE novels ADD COLUMN {name} {spec}")

    @staticmethod
    def current_owner_values():
        """Return (user_id, team_id, seat_id) as strings for local data isolation."""
        user_id = cloud_token.get_user_id()
        ctx = team_ctx.get_context()
        team_id = ctx.get("teamId")
        seat_id = ctx.get("seatId")
        return (
            str(user_id) if user_id is not None else None,
            str(team_id) if team_id is not None else None,
            str(seat_id) if seat_id is not None else None,
        )

    @staticmethod
    def _is_visible_to_current_owner(row) -> bool:
        current_user_id, current_team_id, _current_seat_id = NovelService.current_owner_values()
        source_type = row["source_type"] if "source_type" in row.keys() else ""
        mode = row["mode"] or "import"
        owner_user_id = row["owner_user_id"] if "owner_user_id" in row.keys() else None

        is_team_script = source_type == "team_script" or mode == "team_script_sync"
        if is_team_script:
            row_team_id = row["remote_team_id"] if "remote_team_id" in row.keys() else None
            return current_team_id is not None and str(row_team_id or "") == str(current_team_id)

        # Personal local data:
        # - New rows with owner_user_id are isolated by current cloud user.
        # - Legacy rows without owner predate account isolation; keep them visible
        #   on this machine instead of making existing local novels disappear.
        if current_user_id is not None:
            return (not owner_user_id) or str(owner_user_id) == str(current_user_id)

        # Before login, expose only legacy personal rows; team rows require identity.
        return (not is_team_script) and not owner_user_id

    @staticmethod
    async def get_all():
        """获取所有小说（不含raw_content全文，包含chapter_count）"""
        db = await get_db()
        try:
            cur_cols = await db.execute("PRAGMA table_info(novels)")
            novel_cols = {row[1] for row in await cur_cols.fetchall()}
            if "source_type" not in novel_cols:
                await db.execute("ALTER TABLE novels ADD COLUMN source_type TEXT DEFAULT ''")
                novel_cols.add("source_type")
            if "remote_project_id" not in novel_cols:
                await db.execute("ALTER TABLE novels ADD COLUMN remote_project_id TEXT DEFAULT NULL")
                novel_cols.add("remote_project_id")
            if "remote_team_id" not in novel_cols:
                await db.execute("ALTER TABLE novels ADD COLUMN remote_team_id TEXT DEFAULT NULL")
                novel_cols.add("remote_team_id")
            await NovelService.ensure_owner_columns(db)
            await db.commit()
            # 获取小说列表
            cursor = await db.execute(
                """
                SELECT n.id, n.name, n.created_at, n.updated_at, n.mode,
                       n.cover_url, n.cover_updated_at,
                       n.source_type, n.remote_project_id, n.remote_team_id,
                       n.owner_user_id, n.owner_team_id, n.owner_seat_id,
                       COUNT(c.id) as chapter_count
                FROM novels n
                LEFT JOIN chapters c ON n.id = c.novel_id
                GROUP BY n.id
                ORDER BY n.created_at DESC
                """
            )
            rows = await cursor.fetchall()

            novels = []
            for row in rows:
                source_type = row["source_type"] if "source_type" in row.keys() else ""
                mode = row["mode"] or "import"
                if not NovelService._is_visible_to_current_owner(row):
                    continue
                novels.append({
                    "id": row["id"],
                    "name": row["name"],
                    "chapter_count": row["chapter_count"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "mode": mode,
                    "cover_url": row["cover_url"] if "cover_url" in row.keys() else None,
                    "cover_updated_at": row["cover_updated_at"] if "cover_updated_at" in row.keys() else None,
                    "source_type": source_type,
                    "remote_project_id": row["remote_project_id"] if "remote_project_id" in row.keys() else None,
                    "remote_team_id": row["remote_team_id"] if "remote_team_id" in row.keys() else None,
                    "owner_user_id": row["owner_user_id"] if "owner_user_id" in row.keys() else None,
                    "owner_team_id": row["owner_team_id"] if "owner_team_id" in row.keys() else None,
                    "owner_seat_id": row["owner_seat_id"] if "owner_seat_id" in row.keys() else None,
                })
            return novels
        finally:
            await db.close()

    @staticmethod
    async def get_by_id(novel_id: int):
        """获取小说详情"""
        db = await get_db()
        try:
            await NovelService.ensure_owner_columns(db)
            await db.commit()
            cursor = await db.execute(
                "SELECT * FROM novels WHERE id = ?",
                (novel_id,)
            )
            row = await cursor.fetchone()
            if row:
                if not NovelService._is_visible_to_current_owner(row):
                    return None
                # 获取章节数
                cursor2 = await db.execute(
                    "SELECT COUNT(*) as count FROM chapters WHERE novel_id = ?",
                    (novel_id,)
                )
                count_row = await cursor2.fetchone()
                return {
                    "id": row["id"],
                    "name": row["name"],
                    "raw_content": row["raw_content"],
                    "chapter_count": count_row["count"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "mode": row["mode"] or "import",
                    "outline": row["outline"] or "",
                    "source_type": row["source_type"] if "source_type" in row.keys() else "",
                    "remote_project_id": row["remote_project_id"] if "remote_project_id" in row.keys() else None,
                    "remote_team_id": row["remote_team_id"] if "remote_team_id" in row.keys() else None,
                }
            return None
        finally:
            await db.close()

    @staticmethod
    async def create(novel: NovelCreate):
        """创建小说项目"""
        db = await get_db()
        try:
            now = now_beijing_str()
            await NovelService.ensure_owner_columns(db)
            owner_user_id, owner_team_id, owner_seat_id = NovelService.current_owner_values()
            # v3.61.269:导入打标 mode —— 小说默认 'import',剧本导入传 'script_import'
            novel_mode = (getattr(novel, "mode", None) or "import")
            cursor = await db.execute(
                """
                INSERT INTO novels (name, raw_content, mode, created_at, updated_at, owner_user_id, owner_team_id, owner_seat_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (novel.name, novel.raw_content, novel_mode, now, now, owner_user_id, owner_team_id, owner_seat_id)
            )
            await db.commit()
            novel_id = cursor.lastrowid
            return await NovelService.get_by_id(novel_id)
        finally:
            await db.close()

    @staticmethod
    async def delete(novel_id: int, force: bool = False):
        """删除小说项目(级联清理资源)

        v3.60+: 集成全局视频队列
        - 检查队列里是否有 generating 任务,有则:
          * force=False → 抛 HTTPException(409),提示用户确认
          * force=True  → 终止任务后继续删
        - 删除 DB 主记录(外键 CASCADE 会清 chapters/scripts/storyboards/queue 等)
        - 删除磁盘文件: data/videos/{id}/, data/images/{id}/, data/audios/{id}/
        """
        from fastapi import HTTPException
        if not await NovelService.get_by_id(novel_id):
            return None
        # 1. 检查队列里是否有 generating 任务
        try:
            from services import queue_service
            from services.queue_service import STATUS_GENERATING, STATUS_QUEUED
            active_items = await queue_service.list_items(
                novel_id=novel_id,
                statuses=[STATUS_GENERATING, STATUS_QUEUED],
            )
            generating = [i for i in active_items if i["status"] == STATUS_GENERATING]
            queued = [i for i in active_items if i["status"] == STATUS_QUEUED]

            if generating and not force:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "NOVEL_HAS_ACTIVE_TASKS",
                        "message": f"该小说当前有 {len(generating)} 条视频正在生成,"
                                   f"等待中 {len(queued)} 条。删除会中断生成,需重新提交。",
                        "generating": len(generating),
                        "queued": len(queued),
                    },
                )

            # 终止 generating 任务
            if active_items:
                from services.queue_worker import get_worker
                worker = get_worker()
                for item in active_items:
                    try:
                        await worker.abort(item["id"], "小说被删除")
                    except Exception as e:
                        logger.warning(f"[novel.delete] 中断队列任务 {item['id']} 失败: {e}")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"[novel.delete] 队列检查失败(继续删): {e}")

        # 2. 删 DB(外键 CASCADE 自动清 chapters/scripts/storyboards/extraction/queue 等)
        db = await get_db()
        try:
            # llm_logs 没有外键约束,显式清
            await db.execute("DELETE FROM llm_logs WHERE novel_id = ?", (novel_id,))
            logger.info(f"[novel] 已清理小说 {novel_id} 的所有 llm_logs")
            await db.execute("DELETE FROM novels WHERE id = ?", (novel_id,))
            await db.commit()
        finally:
            await db.close()

        # 3. 删磁盘文件(失败不影响 DB,孤儿文件由后台 GC 兜底)
        deleted_files, freed_bytes = await NovelService._delete_novel_media(novel_id)
        logger.info(
            f"[novel.delete] novel_id={novel_id} 磁盘清理完成: "
            f"删除 {deleted_files} 个文件, 释放 {freed_bytes/1024/1024:.1f} MB"
        )

        return {
            "deleted": True,
            "deleted_files": deleted_files,
            "freed_bytes": freed_bytes,
        }

    @staticmethod
    async def _delete_novel_media(novel_id: int) -> tuple:
        """删除小说在磁盘上的所有媒体资源"""
        import os
        import shutil
        from utils.paths import get_media_dir, get_data_dir

        deleted_files = 0
        freed_bytes = 0

        # 媒体根目录(用户可改) + data 根目录(尾帧用)
        candidates = []
        media_root = get_media_dir()
        data_root = get_data_dir()
        for cat in ("videos", "images", "audios"):
            candidates.append(os.path.join(media_root, cat, str(novel_id)))
        # 尾帧/缓存
        candidates.append(os.path.join(data_root, "frames", str(novel_id)))
        candidates.append(os.path.join(data_root, "last_frames", str(novel_id)))

        for path in candidates:
            if not os.path.isdir(path):
                continue
            try:
                # 先统计大小
                for root, _dirs, files in os.walk(path):
                    for f in files:
                        try:
                            fp = os.path.join(root, f)
                            freed_bytes += os.path.getsize(fp)
                            deleted_files += 1
                        except Exception:
                            pass
                shutil.rmtree(path, ignore_errors=True)
                logger.info(f"[novel.delete] 已删除目录: {path}")
            except Exception as e:
                logger.warning(f"[novel.delete] 删除目录失败 {path}: {e}")

        return deleted_files, freed_bytes

    @staticmethod
    def _parse_chinese_number(text: str) -> int:
        """将中文数字转换为阿拉伯数字"""
        chinese_nums = {
            '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
            '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
            '十': 10, '百': 100, '千': 1000
        }
        
        result = 0
        temp = 0
        for char in text:
            if char in chinese_nums:
                num = chinese_nums[char]
                if num >= 10:
                    if temp == 0:
                        temp = 1
                    result += temp * num
                    temp = 0
                else:
                    temp = temp * 10 + num if temp else num
        result += temp
        return result if result > 0 else 0

    @staticmethod
    def _extract_chapter_number(title: str) -> int:
        """从章节标题中提取序号"""
        # 匹配阿拉伯数字
        match = re.search(r'\d+', title)
        if match:
            return int(match.group())
        
        # 匹配中文数字
        chinese_pattern = r'[零一二三四五六七八九十百千]+'
        match = re.search(chinese_pattern, title)
        if match:
            return NovelService._parse_chinese_number(match.group())
        
        return 0

    @staticmethod
    def _chapter_key(title: str, fallback_order: int) -> str:
        """章节增量匹配键:优先按显式集号/章节号匹配,兜底顺序位。"""
        text = (title or "").strip()
        match = re.search(r'\bEP\s*0*(\d+)\b', text, re.IGNORECASE)
        if match:
            return f"num:{int(match.group(1))}"

        match = re.search(r'第\s*([\d零一二三四五六七八九十百千]+)\s*[章回节卷集]', text)
        if match:
            raw = match.group(1)
            try:
                num = int(raw)
            except ValueError:
                num = NovelService._parse_chinese_number(raw)
            if num:
                return f"num:{num}"

        match = re.search(r'\bChapter\s+0*(\d+)\b', text, re.IGNORECASE)
        if match:
            return f"num:{int(match.group(1))}"

        match = re.match(r'\s*0*(\d{1,4})(?:[、.:\s]|$)', text)
        if match:
            return f"num:{int(match.group(1))}"

        return f"order:{fallback_order}"

    @staticmethod
    def _split_chapters_from_content(content: str):
        """用和 parse_chapters 一致的规则切出章节列表,不写库。"""
        chapter_patterns = [
            (r'(?:^|\n)\s*#{0,6}\s*\*{0,2}(EP\s*\d+)\*{0,2}\s*[::]?\s*([^\n]*)', 2),
            (r'(?:^|\n)\s*(?:#{1,6}\s+)?\*{0,2}(第\s*[\d零一二三四五六七八九十百千]+\s*[章回节卷集])\*{0,2}\s*[::]?\s*([^\n]*)', 2),
            (r'(?:^|\n)\s*(?:#{1,6}\s+)?\*{0,2}(Chapter\s+\d+)\*{0,2}\s*[::]?\s*([^\n]*)', 2),
            (r'(?:^|\n)\s*#{1,6}\s+\*{0,2}(\d+)\*{0,2}\s*[、..]\s*([^\n]+)', 2),
            (r'(?:^|\n)[ \t]*(\d{1,4})\s+([\u4e00-\u9fa5]{2,10})[ \t]*(?=\n|$)', 3),
        ]

        def _looks_like_real_chapters(_matches, _content: str) -> bool:
            if len(_matches) < 2:
                return True
            try:
                nums = [int(m.group(1)) for m in _matches]
            except (ValueError, IndexError):
                return False
            for i in range(len(nums) - 1):
                if nums[i + 1] <= nums[i]:
                    return False
            if nums[0] > 5:
                return False
            gaps = [_matches[i + 1].start() - _matches[i].end() for i in range(len(_matches) - 1)]
            return min(gaps) >= 30

        chapters = []
        last_pos = 0
        last_title = ""
        src = content or ""

        for pattern, min_required in chapter_patterns:
            matches = list(re.finditer(pattern, src, re.IGNORECASE | re.MULTILINE))
            if len(matches) >= min_required:
                if min_required >= 3 and not _looks_like_real_chapters(matches, src):
                    continue
                chapters = []
                for i, match in enumerate(matches):
                    start_pos = match.start()
                    chapter_num = match.group(1).strip().strip('*') if len(match.groups()) >= 1 else ""
                    title_part = match.group(2).strip().strip('*').strip() if len(match.groups()) >= 2 else ""
                    if title_part:
                        current_title = title_part if title_part.startswith(chapter_num) else f"{chapter_num}: {title_part}"
                    else:
                        current_title = chapter_num

                    if i > 0:
                        chapter_content = src[last_pos:start_pos].strip()
                        if chapter_content:
                            chapters.append({
                                "title": last_title if last_title else f"第{len(chapters) + 1}章",
                                "content": chapter_content,
                            })
                    last_title = current_title
                    last_pos = match.end()

                if last_pos < len(src):
                    chapter_content = src[last_pos:].strip()
                    if chapter_content:
                        chapters.append({
                            "title": last_title if last_title else f"第{len(chapters) + 1}章",
                            "content": chapter_content,
                        })
                break

        if len(chapters) == 0:
            paragraphs = [p.strip() for p in src.split('\n') if p.strip()]
            chunk_size = 50
            for i in range(0, len(paragraphs), chunk_size):
                chunk = paragraphs[i:i + chunk_size]
                chapters.append({
                    "title": f"第{i // chunk_size + 1}部分",
                    "content": '\n\n'.join(chunk),
                })

        return chapters

    @staticmethod
    async def parse_chapters(novel_id: int):
        """自动解析章节"""
        db = await get_db()
        try:
            # 获取小说内容
            cursor = await db.execute(
                "SELECT raw_content FROM novels WHERE id = ?",
                (novel_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return None
            
            content = row["raw_content"]
            
            # 章节匹配正则
            # 支持:第X章、第X节、Chapter X、第一章、第二十三章等
            # 支持 Markdown 标题格式:## 第1集:重生
            # 支持 Markdown 加粗格式:**第一集**、**第二集:标题**
            # v3.61.73 新增:"N 中文标题" 独占一行(如"1 赐婚"、"2 大婚")
            # 每个 pattern 后面跟最小匹配数门槛 — 越松的格式门槛越严,防误判
            chapter_patterns = [
                # 0) v3.61.258:EP/集编号(如 "# EP01《标题》"、"EP 1"、"ep01:标题")
                #    短剧/漫剧剧本常用 EP 编号,旧正则不认 → 整本走 fallback 按 50 段硬切成 N 个"第N部分"。
                #    >=2 即认;不区分大小写(re.IGNORECASE 已开)。
                (r'(?:^|\n)\s*#{0,6}\s*\*{0,2}(EP\s*\d+)\*{0,2}\s*[::]?\s*([^\n]*)', 2),
                # 1) 第 X 章/回/节/卷/集 — 最可靠,>=2 即认
                (r'(?:^|\n)\s*(?:#{1,6}\s+)?\*{0,2}(第\s*[\d零一二三四五六七八九十百千]+\s*[章回节卷集])\*{0,2}\s*[::]?\s*([^\n]*)', 2),
                # 2) Chapter X
                (r'(?:^|\n)\s*(?:#{1,6}\s+)?\*{0,2}(Chapter\s+\d+)\*{0,2}\s*[::]?\s*([^\n]*)', 2),
                # 3) "N、标题" / "N.标题" 但必须带 Markdown 标题前缀(#)
                # 禁止无 Markdown 前缀的纯 "1. xxx",避免把剧本场景号误判为章节
                (r'(?:^|\n)\s*#{1,6}\s+\*{0,2}(\d+)\*{0,2}\s*[、..]\s*([^\n]+)', 2),
                # 4) v3.61.73:"N 中文标题"独占一行(如"1 赐婚"、"2 大婚")
                # 阿拉伯数字 + 空格 + 2-10 字纯中文,前后必须是换行(或开头/结尾)
                # 风险:正文里"3 个月后"如果独占一行也会匹配 → 抬高门槛 >=3 + 后面用 _looks_like_real_chapters 校验间距
                (r'(?:^|\n)[ \t]*(\d{1,4})\s+([\u4e00-\u9fa5]{2,10})[ \t]*(?=\n|$)', 3),
            ]

            chapters = []
            last_pos = 0
            last_title = ""

            def _looks_like_real_chapters(_matches, _content: str) -> bool:
                """v3.61.73 防误判:松规则(数字+空格+中文)容易把正文里的"3 个月后"误判。
                需同时满足:
                  ① 章节数字单调递增(真章节都是 1,2,3...)
                  ② 第一个章节数字 ≤ 5(从开头开始,而不是"1990 年代"这种)
                  ③ 章节间距 ≥ 50 字(避免连续多行数字行)
                """
                if len(_matches) < 2:
                    return True
                # 提取每个匹配的数字
                try:
                    nums = [int(m.group(1)) for m in _matches]
                except (ValueError, IndexError):
                    return False
                # ① 单调递增
                for i in range(len(nums) - 1):
                    if nums[i+1] <= nums[i]:
                        return False
                # ② 第一个 ≤ 5
                if nums[0] > 5:
                    return False
                # ③ 间距(真实章节再短也得几十字,误判"3 个月后\n5 年后"间距通常 < 20)
                gaps = [_matches[i+1].start() - _matches[i].end() for i in range(len(_matches)-1)]
                return min(gaps) >= 30

            # 尝试用正则匹配章节
            for pattern, min_required in chapter_patterns:
                matches = list(re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE))
                if len(matches) >= min_required:
                    # 松规则(第 4 条)额外校验章节间距合理,避免把正文里的"3 个月"误判
                    if min_required >= 3 and not _looks_like_real_chapters(matches, content):
                        continue
                    chapters = []
                    for i, match in enumerate(matches):
                        start_pos = match.start()
                        # 提取章节标题
                        # group(1) = 章节编号（如 "第1集"），group(2) = 标题（如 "重生"）
                        chapter_num = match.group(1).strip().strip('*') if len(match.groups()) >= 1 else ""
                        title_part = match.group(2).strip().strip('*').strip() if len(match.groups()) >= 2 else ""
                        
                        # 组合完整标题：章节编号 + 标题部分
                        if title_part:
                            if title_part.startswith(chapter_num):
                                current_title = title_part
                            else:
                                current_title = f"{chapter_num}: {title_part}"
                        else:
                            current_title = chapter_num
                        
                        if i > 0:
                            # 先保存上一个章节（用上一个章节的标题）
                            chapter_content = content[last_pos:start_pos].strip()
                            if chapter_content:
                                chapters.append({
                                    "title": last_title if last_title else f"第{len(chapters)+1}章",
                                    "content": chapter_content
                                })
                        # 更新标题和位置（当前章节的标题留给下次循环保存）
                        last_title = current_title
                        last_pos = match.end()
                    
                    # 添加最后一个章节
                    if last_pos < len(content):
                        chapter_content = content[last_pos:].strip()
                        if chapter_content:
                            chapters.append({
                                "title": last_title if last_title else f"第{len(chapters)+1}章",
                                "content": chapter_content
                            })
                    break
            
            # 如果没有识别到章节，按固定段落数拆分
            if len(chapters) == 0:
                paragraphs = [p.strip() for p in content.split('\n') if p.strip()]
                chunk_size = 50  # 每50段作为一个章节
                
                for i in range(0, len(paragraphs), chunk_size):
                    chunk = paragraphs[i:i + chunk_size]
                    chapter_content = '\n\n'.join(chunk)
                    chapters.append({
                        "title": f"第{i//chunk_size + 1}部分",
                        "content": chapter_content
                    })
            
            # 清空现有章节
            await db.execute(
                "DELETE FROM chapters WHERE novel_id = ?",
                (novel_id,)
            )
            
            # 插入新章节
            for idx, chapter in enumerate(chapters):
                await db.execute(
                    """
                    INSERT INTO chapters (novel_id, title, content, sort_order)
                    VALUES (?, ?, ?, ?)
                    """,
                    (novel_id, chapter["title"], chapter["content"], idx)
                )
            
            await db.commit()
            return len(chapters)
        finally:
            await db.close()

    @staticmethod
    async def incremental_import_chapters(novel_id: int, raw_content: str):
        """增量导入章节:同集号/章节号更新,不存在则新增;不清空旧章节。"""
        chapters = NovelService._split_chapters_from_content(raw_content)
        if not chapters:
            return {"updated": 0, "created": 0, "total": 0}

        db = await get_db()
        try:
            cursor = await db.execute("SELECT id FROM novels WHERE id = ?", (novel_id,))
            if not await cursor.fetchone():
                return None

            existing_rows = await (await db.execute(
                "SELECT id, title, sort_order FROM chapters WHERE novel_id=? ORDER BY sort_order, id",
                (novel_id,),
            )).fetchall()
            existing_by_key = {
                NovelService._chapter_key(row["title"], idx + 1): row
                for idx, row in enumerate(existing_rows)
            }
            max_sort = max([row["sort_order"] or 0 for row in existing_rows], default=-1)
            now = now_beijing_str()
            updated = 0
            created = 0

            for idx, chapter in enumerate(chapters):
                key = NovelService._chapter_key(chapter["title"], idx + 1)
                existing = existing_by_key.get(key)
                if existing:
                    await db.execute(
                        """
                        UPDATE chapters
                        SET title=?, content=?, sort_order=?, updated_at=?
                        WHERE id=?
                        """,
                        (chapter["title"], chapter["content"], existing["sort_order"], now, existing["id"]),
                    )
                    updated += 1
                else:
                    max_sort += 1
                    await db.execute(
                        """
                        INSERT INTO chapters (novel_id, title, content, sort_order, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (novel_id, chapter["title"], chapter["content"], max_sort, now),
                    )
                    created += 1

            # 保留历史 raw_content,追加本次导入原文,便于追溯;章节表才是合并后的权威内容。
            await db.execute(
                """
                UPDATE novels
                SET raw_content = COALESCE(raw_content, '') || ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (f"\n\n\n--- 增量导入 {now} ---\n\n{raw_content}", now, novel_id),
            )
            await db.commit()
            return {"updated": updated, "created": created, "total": len(chapters)}
        finally:
            await db.close()

    @staticmethod
    async def get_chapters(novel_id: int):
        """获取某小说的所有章节"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT * FROM chapters 
                WHERE novel_id = ? 
                ORDER BY sort_order, id
                """,
                (novel_id,)
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            await db.close()

    @staticmethod
    async def update_chapter(chapter_id: int, data: ChapterUpdate):
        """更新章节"""
        db = await get_db()
        try:
            # 构建更新字段
            updates = []
            params = []
            if data.title is not None:
                updates.append("title = ?")
                params.append(data.title)
            if data.content is not None:
                updates.append("content = ?")
                params.append(data.content)
            if data.sort_order is not None:
                updates.append("sort_order = ?")
                params.append(data.sort_order)
            
            if not updates:
                return None
            
            params.append(chapter_id)
            await db.execute(
                f"UPDATE chapters SET {', '.join(updates)} WHERE id = ?",
                params
            )
            await db.commit()
            
            cursor = await db.execute(
                "SELECT * FROM chapters WHERE id = ?",
                (chapter_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
        finally:
            await db.close()

    @staticmethod
    async def delete_chapter(chapter_id: int):
        """删除章节"""
        db = await get_db()
        try:
            # 先查出该章节关联的 script_ids
            cursor = await db.execute("SELECT id FROM scripts WHERE chapter_id = ?", (chapter_id,))
            script_rows = await cursor.fetchall()
            script_ids = [r[0] if isinstance(r, tuple) else r['id'] for r in script_rows]
            
            await db.execute(
                "DELETE FROM chapters WHERE id = ?",
                (chapter_id,)
            )
            # 清理 llm_logs（删除章节会级联删除 scripts，所以需要在删除前获取 script_ids）
            if script_ids:
                placeholders = ','.join(['?' for _ in script_ids])
                await db.execute(
                    f"DELETE FROM llm_logs WHERE source_type IN ('script_convert', 'storyboard') AND source_id IN ({placeholders})",
                    script_ids
                )
                logger.info(f"[chapter] 已清理章节 {chapter_id} 关联的 {len(script_ids)} 个脚本的 llm_logs")
            await db.commit()
            return True
        finally:
            await db.close()

    @staticmethod
    async def add_chapter(novel_id: int, data: ChapterCreate):
        """手动添加章节"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                INSERT INTO chapters (novel_id, title, content, sort_order)
                VALUES (?, ?, ?, ?)
                """,
                (novel_id, data.title, data.content, data.sort_order)
            )
            await db.commit()
            chapter_id = cursor.lastrowid
            
            cursor = await db.execute(
                "SELECT * FROM chapters WHERE id = ?",
                (chapter_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
        finally:
            await db.close()

    @staticmethod
    async def reorder_chapters(novel_id: int, chapter_ids: List[int]):
        """重新排序章节"""
        db = await get_db()
        try:
            for idx, chapter_id in enumerate(chapter_ids):
                await db.execute(
                    "UPDATE chapters SET sort_order = ? WHERE id = ? AND novel_id = ?",
                    (idx, chapter_id, novel_id)
                )
            await db.commit()
            return True
        finally:
            await db.close()
