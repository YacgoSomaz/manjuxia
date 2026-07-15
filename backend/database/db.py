import aiosqlite
import os
import re
import logging
from utils.paths import get_data_dir

# 获取 logger（日志系统已在 main.py 中配置）
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(get_data_dir(), "app.db")


async def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    
    # 启用 WAL 模式以支持并发读写
    await db.execute("PRAGMA journal_mode=WAL")
    # v3.61.127: busy_timeout 30→60 秒,给高并发批量生成留足等待空间
    await db.execute("PRAGMA busy_timeout=60000")
    # WAL 模式下 synchronous=NORMAL 是最快稳定档(默认值,显式声明)
    await db.execute("PRAGMA synchronous=NORMAL")

    return db


async def auto_migrate_table(db, table_name: str, create_sql: str):
    """自动对齐表结构：对比 CREATE TABLE 定义与实际表结构，自动补缺失列"""
    # 1. 获取数据库中实际存在的列
    cursor = await db.execute(f"PRAGMA table_info({table_name})")
    rows = await cursor.fetchall()
    existing_columns = {row[1] for row in rows}  # row[1] 是列名

    # 2. 从 CREATE TABLE SQL 中解析定义的列
    match = re.search(r'\((.*)\)', create_sql, re.DOTALL)
    if not match:
        return

    columns_sql = match.group(1)

    # 逐行解析列定义（按逗号分割，但需要处理括号内的逗号）
    # 使用状态机来正确分割
    parts = []
    depth = 0
    current = []
    for char in columns_sql:
        if char == '(':
            depth += 1
            current.append(char)
        elif char == ')':
            depth -= 1
            current.append(char)
        elif char == ',' and depth == 0:
            parts.append(''.join(current).strip())
            current = []
        else:
            current.append(char)
    if current:
        parts.append(''.join(current).strip())

    for line in parts:
        if not line:
            continue
        # 跳过表级约束
        upper_line = line.upper().lstrip()
        if any(upper_line.startswith(kw) for kw in ['PRIMARY KEY(', 'UNIQUE(', 'FOREIGN KEY', 'CHECK(', 'CONSTRAINT']):
            continue

        # 提取列名（第一个词）
        tokens = line.split()
        if len(tokens) < 2:
            continue

        col_name = tokens[0].strip('`"[]')

        if col_name.upper() in ('PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK', 'CONSTRAINT'):
            continue

        if col_name not in existing_columns:
            alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {line}"
            try:
                await db.execute(alter_sql)
                logger.info(f"自动迁移: {table_name}.{col_name} 添加成功")
            except Exception as e:
                if "duplicate column name" in str(e).lower():
                    logger.debug(f"自动迁移: {table_name}.{col_name} 已存在，跳过")
                elif "non-constant default" in str(e).lower():
                    # SQLite不支持表达式默认值的ALTER TABLE，去掉DEFAULT子句重试
                    # 处理嵌套括号如 DEFAULT (datetime('now', '+8 hours'))
                    stripped_line = re.sub(r'\bDEFAULT\s+\((?:[^()]*|\([^()]*\))*\)', '', line, flags=re.IGNORECASE).strip()
                    stripped_line = re.sub(r'\bDEFAULT\s+\S+', '', stripped_line, flags=re.IGNORECASE).strip()
                    alter_sql_retry = f"ALTER TABLE {table_name} ADD COLUMN {stripped_line}"
                    try:
                        await db.execute(alter_sql_retry)
                        logger.info(f"自动迁移: {table_name}.{col_name} 添加成功(去除非常量默认值)")
                    except Exception as e2:
                        logger.error(f"自动迁移失败: {table_name}.{col_name} - {e2}")
                        raise
                else:
                    logger.error(f"自动迁移失败: {table_name}.{col_name} - {e}")
                    raise


async def init_db():
    logger.info(f"数据库路径: {DB_PATH}")
    db = await get_db()
    try:
        # 提示词模板表
        logger.info("创建表: prompt_templates")
        create_prompt_templates = """
            CREATE TABLE IF NOT EXISTS prompt_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                content TEXT NOT NULL,
                variables TEXT DEFAULT '[]',
                description TEXT DEFAULT '',
                is_preset INTEGER DEFAULT 0,
                genres TEXT DEFAULT '[]',
                admin_id INTEGER DEFAULT NULL,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
            )
        """
        await db.execute(create_prompt_templates)
        await auto_migrate_table(db, "prompt_templates", create_prompt_templates)

        # 作品标签定义表：用于小说导入打标签、模板推荐和流程校验。
        logger.info("创建表: tag_definitions")
        create_tag_definitions = """
            CREATE TABLE IF NOT EXISTS tag_definitions (
                code TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                dimension TEXT NOT NULL,
                aliases TEXT DEFAULT '[]',
                description TEXT DEFAULT '',
                sort_order INTEGER DEFAULT 0,
                enabled INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
            )
        """
        await db.execute(create_tag_definitions)
        await auto_migrate_table(db, "tag_definitions", create_tag_definitions)

        logger.info("创建表: novel_tags")
        create_novel_tags = """
            CREATE TABLE IF NOT EXISTS novel_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                tag_code TEXT NOT NULL,
                label TEXT NOT NULL,
                dimension TEXT NOT NULL,
                score REAL DEFAULT 1.0,
                source TEXT DEFAULT 'manual',
                evidence TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                UNIQUE(novel_id, tag_code),
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            )
        """
        await db.execute(create_novel_tags)
        await auto_migrate_table(db, "novel_tags", create_novel_tags)
        
        # 大模型API配置表
        logger.info("创建表: llm_configs")
        create_llm_configs = """
            CREATE TABLE IF NOT EXISTS llm_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                base_url TEXT NOT NULL,
                api_key TEXT NOT NULL,
                model_name TEXT NOT NULL,
                temperature REAL DEFAULT 0.7,
                max_tokens INTEGER DEFAULT 4096,
                context_window INTEGER DEFAULT 4096,
                extra_params TEXT DEFAULT '{}',
                config_type TEXT DEFAULT 'llm',
                image_ratio TEXT DEFAULT '16:9',
                request_timeout INTEGER DEFAULT 60,
                download_timeout INTEGER DEFAULT 60,
                retry_count INTEGER DEFAULT 0,
                generation_mode TEXT DEFAULT '',
                duration INTEGER DEFAULT 15,
                browser_path TEXT DEFAULT '',
                preset_id INTEGER DEFAULT NULL,
                api_style TEXT DEFAULT 'auto',
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
            )
        """
        await db.execute(create_llm_configs)
        await auto_migrate_table(db, "llm_configs", create_llm_configs)

        # LLM 配置预设表(从 admin-server 同步)
        logger.info("创建表: llm_config_presets")
        create_llm_config_presets = """
            CREATE TABLE IF NOT EXISTS llm_config_presets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                remote_id INTEGER,
                category TEXT NOT NULL,
                config_type TEXT NOT NULL,
                provider_code TEXT NOT NULL,
                display_name TEXT NOT NULL,
                provider_icon TEXT,
                description TEXT,
                base_url TEXT,
                base_url_hint TEXT,
                model_mode TEXT NOT NULL,
                model_list TEXT DEFAULT '[]',
                probe_path TEXT DEFAULT '/models',
                default_params TEXT DEFAULT '{}',
                api_style TEXT DEFAULT 'auto',
                key_format_hint TEXT,
                docs_url TEXT,
                sort_order INTEGER DEFAULT 0,
                is_recommended INTEGER DEFAULT 0,
                enabled INTEGER DEFAULT 1,
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                UNIQUE(provider_code, config_type)
            )
        """
        await db.execute(create_llm_config_presets)
        await auto_migrate_table(db, "llm_config_presets", create_llm_config_presets)
        
        # 小说项目表
        logger.info("创建表: novels")
        create_novels = """
            CREATE TABLE IF NOT EXISTS novels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                raw_content TEXT NOT NULL,
                mode TEXT DEFAULT 'import',
                outline TEXT DEFAULT NULL,
                template_id INTEGER DEFAULT NULL,
                cover_url TEXT DEFAULT NULL,
                cover_updated_at TIMESTAMP DEFAULT NULL,
                source_type TEXT DEFAULT '',
                remote_project_id TEXT DEFAULT NULL,
                remote_synced_at TIMESTAMP DEFAULT NULL,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
            )
        """
        await db.execute(create_novels)
        await auto_migrate_table(db, "novels", create_novels)
        
        # 数据迁移：旧的 'creation' 值统一为 'create'(两者同义)
        # 注意:不要把 'script_to_novel' 改成 'create',这是两种不同用户意图(AI 创作 vs 剧本转小说)
        await db.execute("UPDATE novels SET mode = 'create' WHERE mode = 'creation'")
        
        # 章节表
        logger.info("创建表: chapters")
        create_chapters = """
            CREATE TABLE IF NOT EXISTS chapters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                summary TEXT DEFAULT '',
                sort_order INTEGER DEFAULT 0,
                remote_chapter_id TEXT DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            )
        """
        await db.execute(create_chapters)
        await auto_migrate_table(db, "chapters", create_chapters)
        
        # 剧本表
        logger.info("创建表: scripts")
        create_scripts = """
            CREATE TABLE IF NOT EXISTS scripts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                chapter_id INTEGER,
                content TEXT NOT NULL,
                template_id INTEGER DEFAULT NULL,
                scene_meta TEXT DEFAULT '{}',
                remote_chapter_id TEXT DEFAULT NULL,
                remote_version INTEGER DEFAULT 0,
                sync_outdated INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
                FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
            )
        """
        await db.execute(create_scripts)
        await auto_migrate_table(db, "scripts", create_scripts)
        
        # 提取信息表（人物/场景/道具）
        logger.info("创建表: extracted_elements")
        create_extracted_elements = """
            CREATE TABLE IF NOT EXISTS extracted_elements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                element_type TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                attributes TEXT DEFAULT '{}',
                chapter_ids TEXT DEFAULT '[]',
                aliases TEXT DEFAULT '[]',
                image_url TEXT DEFAULT NULL,
                image_prompt TEXT DEFAULT NULL,
                image_status TEXT DEFAULT NULL,
                reference_image TEXT DEFAULT NULL,
                finished_image TEXT DEFAULT NULL,
                grid_image TEXT DEFAULT NULL,
                panorama_url TEXT DEFAULT NULL,
                audio_file TEXT DEFAULT NULL,
                voice_id TEXT DEFAULT NULL,
                volc_asset_id TEXT DEFAULT NULL,
                volc_asset_uri TEXT DEFAULT NULL,
                volc_asset_status TEXT DEFAULT NULL,
                volc_asset_group_id TEXT DEFAULT NULL,
                remote_source TEXT DEFAULT NULL,
                remote_id TEXT DEFAULT NULL,
                active_variant_id INTEGER DEFAULT NULL,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            )
        """
        await db.execute(create_extracted_elements)
        await auto_migrate_table(db, "extracted_elements", create_extracted_elements)

        # v3.61.158: 人物马甲(变体)— 同一人物多套形象,切换 active_variant_id 后续生成都用对应素材
        # 字段级 fallback:variant 字段为空 → 用 element 同字段(由 resolve_active_character_asset helper 合并)
        logger.info("创建表: character_variants")
        create_character_variants = """
            CREATE TABLE IF NOT EXISTS character_variants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                element_id INTEGER NOT NULL,
                variant_name TEXT NOT NULL,
                description TEXT DEFAULT '',
                image_url TEXT DEFAULT NULL,
                image_prompt TEXT DEFAULT NULL,
                image_status TEXT DEFAULT NULL,
                reference_image TEXT DEFAULT NULL,
                finished_image TEXT DEFAULT NULL,
                audio_file TEXT DEFAULT NULL,
                volc_asset_id TEXT DEFAULT NULL,
                volc_asset_uri TEXT DEFAULT NULL,
                volc_asset_status TEXT DEFAULT NULL,
                volc_asset_group_id TEXT DEFAULT NULL,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                FOREIGN KEY (element_id) REFERENCES extracted_elements(id) ON DELETE CASCADE
            )
        """
        await db.execute(create_character_variants)
        await auto_migrate_table(db, "character_variants", create_character_variants)
        await db.execute("CREATE INDEX IF NOT EXISTS idx_variants_element ON character_variants(element_id)")
        
        # 分镜表
        logger.info("创建表: storyboards")
        create_storyboards = """
            CREATE TABLE IF NOT EXISTS storyboards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                script_id INTEGER,
                scene_number INTEGER NOT NULL,
                description TEXT NOT NULL,
                prompt TEXT DEFAULT '',
                characters TEXT DEFAULT '[]',
                scenes TEXT DEFAULT '[]',
                props TEXT DEFAULT '[]',
                excluded_props TEXT DEFAULT '[]',
                excluded_audios TEXT DEFAULT '[]',
                auto_excluded_audios TEXT DEFAULT '[]',
                section_start_state TEXT DEFAULT '{}',
                scene_type TEXT DEFAULT 'normal',
                sort_order INTEGER DEFAULT 0,
                section_number INTEGER DEFAULT 1,
                section_info TEXT DEFAULT '{}',
                scene_index INTEGER DEFAULT NULL,
                scene_image_url TEXT DEFAULT NULL,
                audio_url TEXT DEFAULT NULL,
                style_prompt TEXT DEFAULT NULL,
                video_status TEXT DEFAULT NULL,
                video_url TEXT DEFAULT NULL,
                submit_id TEXT DEFAULT NULL,
                video_submit_time TIMESTAMP DEFAULT NULL,
                extra_reference_image TEXT DEFAULT NULL,
                extra_reference_desc TEXT DEFAULT NULL,
                topview_image TEXT DEFAULT NULL,
                topview_prompt TEXT DEFAULT NULL,
                topview_start_prompt TEXT DEFAULT NULL,
                topview_end_prompt TEXT DEFAULT NULL,
                topview_dispatch_text TEXT DEFAULT NULL,
                start_frame_image TEXT DEFAULT NULL,
                end_frame_image TEXT DEFAULT NULL,
                template_id INTEGER DEFAULT NULL,
                video_fail_reason TEXT DEFAULT NULL,
                end_state TEXT DEFAULT NULL,
                last_frame_path TEXT DEFAULT NULL,
                last_frame_orig_path TEXT DEFAULT NULL,
                video_provider TEXT DEFAULT NULL,
                video_config_id INTEGER DEFAULT NULL,
                last_frame_volc_asset_id TEXT DEFAULT NULL,
                last_frame_volc_asset_uri TEXT DEFAULT NULL,
                last_frame_volc_asset_status TEXT DEFAULT NULL,
                last_frame_volc_asset_group_id TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
                FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
            )
        """
        await db.execute(create_storyboards)
        await auto_migrate_table(db, "storyboards", create_storyboards)
        
        # 全局视频生成队列表 (v3.60+)
        # 设计参考: docs/全局视频队列_技术设计.md
        # v3.61.0: 新增 provider 字段(jimeng / volcengine_ark)区分调用第三方
        logger.info("创建表: video_task_queue")
        create_video_task_queue = """
            CREATE TABLE IF NOT EXISTS video_task_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                script_id INTEGER NOT NULL,
                storyboard_id INTEGER NOT NULL,
                mode TEXT NOT NULL DEFAULT 'parallel',
                use_chain_frame INTEGER NOT NULL DEFAULT 0,
                chain_frame_desc TEXT DEFAULT NULL,
                video_config_id INTEGER DEFAULT NULL,
                params_json TEXT DEFAULT NULL,
                prompt_snapshot TEXT DEFAULT NULL,
                priority INTEGER NOT NULL DEFAULT 100,
                status TEXT NOT NULL DEFAULT 'queued',
                retry_count INTEGER NOT NULL DEFAULT 0,
                error_code TEXT DEFAULT NULL,
                error_message TEXT DEFAULT NULL,
                jimeng_task_id TEXT DEFAULT NULL,
                video_url TEXT DEFAULT NULL,
                last_frame_url TEXT DEFAULT NULL,
                label TEXT NOT NULL DEFAULT '',
                provider TEXT NOT NULL DEFAULT 'jimeng',
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                started_at TIMESTAMP DEFAULT NULL,
                finished_at TIMESTAMP DEFAULT NULL,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
                FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
                FOREIGN KEY (storyboard_id) REFERENCES storyboards(id) ON DELETE CASCADE
            )
        """
        await db.execute(create_video_task_queue)
        await auto_migrate_table(db, "video_task_queue", create_video_task_queue)
        # v3.61.296: 全局队列按 storyboard 做活跃态硬幂等。
        # 创建部分唯一索引前先折叠历史脏数据,避免同一分镜留下多条 queued/generating 行。
        try:
            cur_dup = await db.execute(
                """SELECT storyboard_id, COUNT(*) AS cnt
                FROM video_task_queue
                WHERE status IN ('queued','generating')
                GROUP BY storyboard_id
                HAVING COUNT(*) > 1"""
            )
            dup_groups = await cur_dup.fetchall()
            collapsed = 0
            for group in dup_groups:
                storyboard_id = group["storyboard_id"]
                cur_rows = await db.execute(
                    """SELECT id, status, jimeng_task_id, started_at, created_at
                    FROM video_task_queue
                    WHERE storyboard_id = ? AND status IN ('queued','generating')
                    ORDER BY
                        CASE WHEN status='generating' THEN 0 ELSE 1 END,
                        CASE WHEN jimeng_task_id IS NOT NULL AND jimeng_task_id != '' THEN 0 ELSE 1 END,
                        id DESC""",
                    (storyboard_id,),
                )
                rows = await cur_rows.fetchall()
                if len(rows) <= 1:
                    continue
                keep_id = rows[0]["id"]
                drop_ids = [int(row["id"]) for row in rows[1:]]
                placeholders = ",".join("?" * len(drop_ids))
                await db.execute(
                    f"""UPDATE video_task_queue
                    SET status='aborted',
                        finished_at=datetime('now', '+8 hours'),
                        error_code='DUPLICATE_ACTIVE_COLLAPSED',
                        error_message='启动时发现同一分镜存在重复活跃队列项,已保留一条并折叠其余项'
                    WHERE id IN ({placeholders})""",
                    drop_ids,
                )
                collapsed += len(drop_ids)
                logger.warning(
                    f"[queue] 折叠重复活跃队列 storyboard_id={storyboard_id}, "
                    f"keep={keep_id}, aborted={drop_ids}"
                )
            if collapsed:
                logger.warning(f"[queue] 已折叠 {collapsed} 条重复活跃队列项")
        except Exception as e:
            logger.warning(f"折叠重复活跃队列项失败(继续启动): {e}")
        # 索引
        try:
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON video_task_queue(status, priority, created_at)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_queue_storyboard ON video_task_queue(storyboard_id, status)"
            )
            await db.execute(
                "CREATE INDEX IF NOT EXISTS idx_queue_novel ON video_task_queue(novel_id, status)"
            )
            await db.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_active_storyboard_unique "
                "ON video_task_queue(storyboard_id) "
                "WHERE status IN ('queued','generating')"
            )
        except Exception as e:
            logger.warning(f"video_task_queue 索引创建失败(忽略): {e}")

        # 大模型调用日志表
        logger.info("创建表: llm_logs")
        create_llm_logs = """
            CREATE TABLE IF NOT EXISTS llm_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_type TEXT NOT NULL,
                model TEXT,
                config_name TEXT,
                provider_code TEXT,
                base_url TEXT,
                input_prompt TEXT,
                output_content TEXT,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                status TEXT DEFAULT 'running',
                error_message TEXT,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                duration_seconds REAL DEFAULT 0,
                novel_id INTEGER,
                chapter_title TEXT,
                source_id INTEGER DEFAULT NULL,
                source_type TEXT DEFAULT NULL,
                source_scene_index INTEGER DEFAULT NULL,
                remote_url TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
            )
        """
        await db.execute(create_llm_logs)
        await auto_migrate_table(db, "llm_logs", create_llm_logs)
        
        # 通用 KV 设置表(全局开关、用户偏好等)
        logger.info("创建表: app_settings")
        create_app_settings = """
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours'))
            )
        """
        await db.execute(create_app_settings)

        # 图片风格设置表
        logger.info("创建表: image_style_settings")
        create_image_style_settings = """
            CREATE TABLE IF NOT EXISTS image_style_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                element_type TEXT NOT NULL,
                prefix_prompt TEXT DEFAULT '',
                suffix_prompt TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                UNIQUE(novel_id, element_type)
            )
        """
        await db.execute(create_image_style_settings)
        await auto_migrate_table(db, "image_style_settings", create_image_style_settings)
        
        # AI创作上下文表（角色、场景、道具等）
        logger.info("创建表: novel_writing_context")
        create_novel_writing_context = """
            CREATE TABLE IF NOT EXISTS novel_writing_context (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                context_type TEXT NOT NULL,
                name TEXT NOT NULL,
                content TEXT DEFAULT '',
                dynamic_state TEXT DEFAULT '',
                last_chapter_id INTEGER,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
                FOREIGN KEY (last_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
                UNIQUE(novel_id, context_type, name)
            )
        """
        await db.execute(create_novel_writing_context)
        await auto_migrate_table(db, "novel_writing_context", create_novel_writing_context)

        # v3.61.92: 溶图历史表 — 设置 → 其他功能 → 溶图 模块用
        logger.info("创建表: fusion_history")
        create_fusion_history = """
            CREATE TABLE IF NOT EXISTS fusion_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                config_id INTEGER NOT NULL,
                config_name TEXT DEFAULT '',
                model_name TEXT DEFAULT '',
                prompt TEXT NOT NULL,
                ratio TEXT NOT NULL DEFAULT '1:1',
                reference_images TEXT DEFAULT '[]',
                output_image_url TEXT DEFAULT NULL,
                output_remote_url TEXT DEFAULT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                error_message TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                finished_at TIMESTAMP DEFAULT NULL
            )
        """
        await db.execute(create_fusion_history)
        await auto_migrate_table(db, "fusion_history", create_fusion_history)

        # v3.61.261: 封面多比例 — 一本小说可有多个比例(3:4/4:3/1:1...)各一张封面
        # novel_id + ratio 唯一(同比例重新生成则覆盖该行);is_primary=1 的那张同步到 novels.cover_url
        create_cover_variants = """
            CREATE TABLE IF NOT EXISTS cover_variants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                ratio TEXT NOT NULL,
                image_url TEXT DEFAULT NULL,
                raw_image_url TEXT DEFAULT NULL,
                is_primary INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                updated_at TIMESTAMP DEFAULT (datetime('now', '+8 hours')),
                UNIQUE(novel_id, ratio)
            )
        """
        await db.execute(create_cover_variants)
        await auto_migrate_table(db, "cover_variants", create_cover_variants)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_cover_variants_novel ON cover_variants(novel_id)"
        )

        # ======== 时区迁移：确保所有时间字段为北京时间 ========
        # 使用 _migrations 表防止重复执行
        logger.info("检查时区迁移状态...")
        cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'")
        migrations_table = await cursor.fetchone()
        if not migrations_table:
            await db.execute("CREATE TABLE _migrations (name TEXT PRIMARY KEY, applied_at TEXT)")
            logger.info("创建 _migrations 表")

        # 迁移v2: 统一所有时间为北京时间简单格式
        # 处理3种情况: UTC纯格式(+8h)、ISO带时区格式(提取本地时间)、已正确的纯格式(不变)
        cursor = await db.execute("SELECT 1 FROM _migrations WHERE name='timezone_v2_beijing'")
        already_migrated_v2 = await cursor.fetchone()

        if not already_migrated_v2:
            logger.info("开始执行时区迁移 v2...")
            # 定义需要修复的表和字段
            time_fields = [
                ('llm_logs', ['created_at', 'start_time', 'end_time']),
                ('novels', ['created_at', 'updated_at']),
                ('chapters', ['updated_at']),
                ('scripts', ['created_at']),
                ('storyboards', ['created_at', 'updated_at']),
                ('prompt_templates', ['created_at', 'updated_at']),
                ('llm_configs', ['created_at', 'updated_at']),
                ('extracted_elements', ['created_at', 'updated_at']),
                ('image_style_settings', ['created_at', 'updated_at']),
                ('novel_writing_context', ['created_at', 'updated_at']),
            ]
            for table, fields in time_fields:
                for field in fields:
                    try:
                        # 1) ISO格式带+08:00: 提取本地时间部分(已是北京时间)
                        await db.execute(f"""
                            UPDATE {table} SET {field} = 
                                substr({field}, 1, 10) || ' ' || substr({field}, 12, 8)
                            WHERE {field} IS NOT NULL AND {field} LIKE '%+08:00'
                        """)
                        # 2) ISO格式带T但无时区(UTC): 转为北京时间
                        await db.execute(f"""
                            UPDATE {table} SET {field} = 
                                datetime(substr({field}, 1, 10) || ' ' || substr({field}, 12, 8), '+8 hours')
                            WHERE {field} IS NOT NULL AND {field} LIKE '%T%' AND {field} NOT LIKE '%+%'
                        """)
                        # 3) 纯格式UTC(长度=19, 年份匹配但时间明显偏小): 
                        #    通过v1迁移标记判断是否已处理过
                    except Exception as e:
                        logger.debug(f"时区迁移 {table}.{field} 步骤异常: {e}")

            # 检查v1迁移是否已运行过
            cursor = await db.execute("SELECT 1 FROM _migrations WHERE name='timezone_utc_to_beijing'")
            v1_done = await cursor.fetchone()
            if not v1_done:
                logger.info("执行时区迁移 v1...")
                # v1从未运行: 纯格式记录都是UTC, 需要+8h
                for table, fields in time_fields:
                    for field in fields:
                        try:
                            await db.execute(f"""
                                UPDATE {table} SET {field} = datetime({field}, '+8 hours')
                                WHERE {field} IS NOT NULL 
                                AND length({field}) = 19 
                                AND {field} NOT LIKE '%T%'
                                AND {field} NOT LIKE '%+%'
                            """)
                        except Exception as e:
                            logger.debug(f"时区迁移v1 {table}.{field} 步骤异常: {e}")

            await db.execute("INSERT OR REPLACE INTO _migrations (name, applied_at) VALUES ('timezone_v2_beijing', datetime('now', '+8 hours'))")
            logger.info("时区迁移 v2 完成")
        else:
            logger.info("时区迁移已完成，跳过")
        # ======== 时区迁移结束 ========

        # 数据清理：修复 extracted_elements 表中的 NULL 值（每次启动都执行）
        logger.info("清理 extracted_elements 表中的 NULL 数据...")
        await db.execute("UPDATE extracted_elements SET attributes = '{}' WHERE attributes IS NULL")
        await db.execute("UPDATE extracted_elements SET chapter_ids = '[]' WHERE chapter_ids IS NULL")
        await db.execute("UPDATE extracted_elements SET aliases = '[]' WHERE aliases IS NULL")
        await db.execute("UPDATE extracted_elements SET description = '' WHERE description IS NULL")

        # v3.61.227: 僵尸 generating 回收（每次启动都执行）
        # 信息提取生图是请求级的;启动时没有任何生成在跑,所以 image_status='generating' 且无任何图
        # 的行 = 上次被中断/崩溃残留的僵尸。统一标 'failed',让卡片显示可重试,而不是永远转圈。
        cur_zombie = await db.execute(
            "UPDATE extracted_elements SET image_status='failed' "
            "WHERE image_status='generating' "
            "AND (image_url IS NULL OR image_url='') "
            "AND (finished_image IS NULL OR finished_image='')"
        )
        _zc = cur_zombie.rowcount if hasattr(cur_zombie, 'rowcount') else 0
        if _zc and _zc > 0:
            logger.info(f"回收 {_zc} 个僵尸 generating 元素(中断残留)→ 标 failed")

        # 数据清理：删除 storyboards 表中 scene_index 为 NULL 的脏数据（每次启动都执行）
        # 这些脏数据是由于之前的文本匹配删除失败导致的
        logger.info("清理 storyboards 表中 scene_index 为 NULL 的脏数据...")
        cursor = await db.execute("DELETE FROM storyboards WHERE scene_index IS NULL")
        deleted_count = cursor.rowcount if hasattr(cursor, 'rowcount') else 0
        if deleted_count > 0:
            logger.info(f"已删除 {deleted_count} 条 scene_index 为 NULL 的脏分镜数据")
        else:
            logger.info("没有发现 scene_index 为 NULL 的脏数据")

        # 数据清理 v3.60.6:重新生成所有队列项的 label,统一为 '章节-#场景-小节' 格式
        # 老格式 '章节-小节-子号' 跟主表 '#场景-小节' 不一致,看起来对不上号
        try:
            cur_lbl = await db.execute(
                """SELECT q.id, q.script_id, q.storyboard_id,
                       sb.scene_index, sb.section_number,
                       c.sort_order AS ch_sort
                FROM video_task_queue q
                LEFT JOIN storyboards sb ON sb.id = q.storyboard_id
                LEFT JOIN scripts s ON s.id = q.script_id
                LEFT JOIN chapters c ON c.id = s.chapter_id"""
            )
            rows_lbl = await cur_lbl.fetchall()
            updated = 0
            for r in rows_lbl:
                ch_no = (int(r["ch_sort"]) + 1) if r["ch_sort"] is not None else (r["script_id"] or 0)
                sec = r["section_number"] or 1
                sci = r["scene_index"]
                if sci is not None:
                    new_label = f"{ch_no}-#{int(sci) + 1}-{sec}"
                else:
                    new_label = f"{ch_no}-#{sec}"
                await db.execute(
                    "UPDATE video_task_queue SET label = ? WHERE id = ?",
                    (new_label, r["id"]),
                )
                updated += 1
            if updated > 0:
                logger.info(f"[启动迁移] 已更新 {updated} 条队列标签为新格式 '章节-#场景-小节'")
        except Exception as e:
            logger.debug(f"队列标签迁移失败(忽略): {e}")

        # v3.60.9 回滚 v3.60.8 的回填策略
        try:
            cur_drop = await db.execute(
                "DELETE FROM video_task_queue WHERE label = '' OR label IS NULL"
            )
            dropped = cur_drop.rowcount if hasattr(cur_drop, 'rowcount') else 0
            if dropped > 0:
                logger.info(f"[v3.60.9 回滚] 已清理 {dropped} 条空标签队列记录")
        except Exception as e:
            logger.debug(f"清理空标签队列记录失败(忽略): {e}")

        # v3.60.11: 启动一刀切 — 删除所有非 done 的队列记录
        # 原因: v3.60.0~10 期间 worker 多个版本的 bug 在 DB 留了一堆 failed/queued/generating
        # 让用户进入干净状态,主表保持原样,需要重新生成的自己手动入队
        try:
            cur_x = await db.execute(
                "DELETE FROM video_task_queue WHERE status != 'done'"
            )
            dropped2 = cur_x.rowcount if hasattr(cur_x, 'rowcount') else 0
            if dropped2 > 0:
                logger.info(f"[v3.60.11 启动清理] 已清空 {dropped2} 条非 done 队列记录(各版本 worker bug 残留)")
        except Exception as e:
            logger.debug(f"v3.60.11 启动清理失败(忽略): {e}")

        # v3.60.9: 不再主动回退主表 storyboard 的失败状态
        # 但是用户现在主表上的"failed"很多其实是 v3.60.0~2 worker bug 造成的假失败
        # 帮他们一次性 reset 主表那些"被误标 failed 但 submit_id 已经被清掉"的镜
        # 因为这种镜如果即梦那边还在跑,可以重新连接(调 video/check 自己的 task list)
        # 简单做: video_status='failed' AND submit_id IS NULL AND video_fail_reason IS NULL
        #         → 几乎可以肯定是误标 → reset 为 pending
        try:
            cur_unfail = await db.execute(
                "UPDATE storyboards SET video_status = 'pending' "
                "WHERE video_status = 'failed' "
                "AND submit_id IS NULL "
                "AND (video_fail_reason IS NULL OR video_fail_reason = '')"
            )
            unfailed = cur_unfail.rowcount if hasattr(cur_unfail, 'rowcount') else 0
            if unfailed > 0:
                logger.info(f"[v3.60.9] 已把 {unfailed} 个无错误原因的 failed 主表镜重置为 pending(误标修正)")
        except Exception as e:
            logger.debug(f"主表 failed 误标修正失败(忽略): {e}")

        # 数据清理 v3.60.5 / v3.60.8: 启动时重置 generating/queued,完全不动 done
        # 原因:旧 session 留下的 generating storyboard,前端 onMounted 会自动 poll-status 查即梦,
        #      即梦那边老任务仍在跑就会显示"生成中 排队 #N",看起来像应用自己启动了任务
        # done 保留(已完成的视频不会偷跑,是用户成果)
        try:
            cur_reset = await db.execute(
                "UPDATE storyboards SET video_status = 'pending', "
                "submit_id = NULL, video_submit_time = NULL "
                "WHERE video_status IN ('generating', 'queued')"
            )
            reset_count = cur_reset.rowcount if hasattr(cur_reset, 'rowcount') else 0
            if reset_count > 0:
                logger.info(
                    f"[启动重置] 已把 {reset_count} 个 generating/queued 分镜重置为 pending"
                    f"(避免应用启动后自动轮询老即梦任务;done 状态保留)"
                )
        except Exception as e:
            logger.debug(f"启动重置 storyboards 状态失败(忽略): {e}")

        # v3.61.15: 把历史英文火山方舟错误翻译成中文(一次性,启动迁移)
        # v3.61.13 起新失败会翻译,但 v3.61.12 之前留下的英文残留要补
        try:
            translations = [
                ("real person", "参考图被识别为含真人人脸 — Seedance 2.0 系列不允许真人参考图。\n解决方法:\n  1) 换成漫画/卡通/Q版风格的角色图\n  2) 切回即梦CLI模式生成\n  3) 换 Seedance 1.5 Pro 模型(允许真人)"),
                ("Safe Experience Mode", "火山方舟「安全体验模式」限额,需到火山控制台 → 模型管理 关闭该选项或提高推理上限"),
                ("inference limit", "火山方舟模型推理已达上限,请到火山控制台调整"),
                ("first/last frame content cannot be mixed", "首尾帧参数不能跟参考图/参考音频混搭(已修)"),
                ("service_tier is not supported", "service_tier 参数不支持(已修)"),
            ]
            for kw, cn in translations:
                # storyboards 表
                await db.execute(
                    "UPDATE storyboards SET video_fail_reason = ? "
                    "WHERE video_fail_reason LIKE ? AND video_status = 'failed'",
                    (cn, f"%{kw}%"),
                )
                # video_task_queue 表
                await db.execute(
                    "UPDATE video_task_queue SET error_message = ? "
                    "WHERE error_message LIKE ?",
                    (cn, f"%{kw}%"),
                )
            logger.info("[v3.61.15] 历史火山方舟英文错误翻译完成")
        except Exception as e:
            logger.debug(f"翻译历史错误失败(忽略): {e}")

        # 数据清理 v3.60.4:重置队列里的所有 queued / generating 状态
        # 原因 1: v3.60.0~2 worker bug 造成的假失败,已无意义
        # 原因 2: v3.60.0~3 期间 queued 记录可能存有过期 params(模型版本/时长 已变化),
        #        启动时让 worker 自动恢复会用错参数,可能跑出非预期的 VIP/长视频导致额外扣点
        # 策略:启动时一刀切 — 所有 queued/generating 改为 aborted,有用户手动重新入队
        try:
            cur_clean = await db.execute(
                "DELETE FROM video_task_queue "
                "WHERE status = 'failed' "
                "AND error_message LIKE '%storyboard 状%' "
                "AND error_code IN ('UNKNOWN', 'NETWORK_ERROR')"
            )
            cleaned_q = cur_clean.rowcount if hasattr(cur_clean, 'rowcount') else 0
            if cleaned_q > 0:
                logger.info(f"已清理 {cleaned_q} 条 v3.60.0~2 worker bug 造成的假失败队列记录")
        except Exception as e:
            logger.debug(f"清理假失败队列记录失败(忽略): {e}")
        # 注: queued/generating 的重置由 queue_worker._recover_on_startup 处理,
        #    它会先查即梦真实状态再决定保 done 还是标 aborted

        # 数据清理 v3.59.37:回退 v3.59.30~36 期间被自动写入 extra_reference_image 的脏数据
        # 旧逻辑会把上镜尾帧 + 默认描述写到下一镜的 extra_reference_image,污染了用户上传字段
        # 回退后:清掉所有「extra_reference_image 是 /data/frames/* + extra_reference_desc 是默认文案」的记录
        # (用户改过描述的不动,认为他们想保留)
        try:
            default_desc = "此图为上一视频的尾帧参考图,本镜从此画面故事的延续,保持场景与角色一致,不重新诠释画风/材质"
            cur2 = await db.execute(
                "UPDATE storyboards SET extra_reference_image = NULL, extra_reference_desc = NULL "
                "WHERE extra_reference_image LIKE '/data/frames/%' AND extra_reference_desc = ?",
                (default_desc,)
            )
            cleaned = cur2.rowcount if hasattr(cur2, 'rowcount') else 0
            if cleaned > 0:
                logger.info(f"已清理 {cleaned} 条被自动污染的 extra_reference_image 脏数据(回退到老逻辑)")
        except Exception as e:
            logger.warning(f"清理 extra_reference 脏数据失败(忽略): {e}")

        await db.commit()
        logger.info("数据库初始化完成")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        raise
    finally:
        await db.close()
