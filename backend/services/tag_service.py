import json
import logging
import re
from typing import Any, Dict, List, Optional

from database.db import get_db
from utils.timezone import now_beijing_str

logger = logging.getLogger(__name__)


TAG_CATALOG: List[Dict[str, Any]] = [
    {"code": "audience_female", "label": "女频", "dimension": "audience", "aliases": ["女性向", "女主", "女强", "大小姐", "二小姐", "嫡女", "庶女", "千金", "夫人", "王妃"], "sort_order": 10},
    {"code": "audience_male", "label": "男频", "dimension": "audience", "aliases": ["男性向", "男主", "赘婿", "战神", "兵王", "奶爸", "修仙"], "sort_order": 20},
    {"code": "audience_general", "label": "通用", "dimension": "audience", "aliases": ["大众", "全龄", "通用向"], "sort_order": 30},
    {"code": "screen_portrait", "label": "竖屏", "dimension": "screen_mode", "aliases": ["竖版", "9:16", "vertical", "portrait"], "sort_order": 40},
    {"code": "screen_landscape", "label": "横屏", "dimension": "screen_mode", "aliases": ["横版", "16:9", "horizontal", "landscape"], "sort_order": 50},

    {"code": "genre_palace", "label": "宅斗", "dimension": "genre", "aliases": ["后宅", "嫡庶", "庶女", "主母", "内宅", "府宅"], "sort_order": 100},
    {"code": "genre_revenge", "label": "复仇", "dimension": "genre", "aliases": ["报仇", "复仇", "重生", "打脸", "逆袭"], "sort_order": 110},
    {"code": "genre_romance", "label": "情感", "dimension": "genre", "aliases": ["爱情", "恋爱", "虐恋", "甜宠", "婚恋", "追妻"], "sort_order": 120},
    {"code": "genre_costume", "label": "古装", "dimension": "genre", "aliases": ["古言", "古代", "王府", "侯府", "殿下", "皇后", "将军"], "sort_order": 130},
    {"code": "genre_urban", "label": "都市", "dimension": "genre", "aliases": ["现代", "总裁", "职场", "豪门", "医院", "公司"], "sort_order": 140},
    {"code": "genre_suspense", "label": "悬疑", "dimension": "genre", "aliases": ["案件", "侦探", "调查", "真相", "凶手", "谜团"], "sort_order": 150},
    {"code": "genre_scifi", "label": "科幻", "dimension": "genre", "aliases": ["实验舱", "机甲", "星际", "AI", "机器人", "未来", "基地"], "sort_order": 160},
    {"code": "genre_fantasy", "label": "玄幻", "dimension": "genre", "aliases": ["修仙", "灵力", "妖族", "魔尊", "仙门", "秘境"], "sort_order": 170},
    {"code": "genre_wuxia", "label": "武侠", "dimension": "genre", "aliases": ["江湖", "侠客", "门派", "剑客", "内力"], "sort_order": 180},
    {"code": "genre_family", "label": "家庭", "dimension": "genre", "aliases": ["亲情", "父母", "兄妹", "家人", "收养"], "sort_order": 190},
    {"code": "genre_campus", "label": "校园", "dimension": "genre", "aliases": ["学生", "校园", "同学", "教室"], "sort_order": 200},
    {"code": "genre_business", "label": "商战", "dimension": "genre", "aliases": ["商业", "集团", "股权", "合同", "谈判"], "sort_order": 210},

    {"code": "trope_ai_vertical_manga", "label": "AI竖屏高能短剧", "dimension": "trope", "aliases": ["AI漫剧", "竖屏高能", "强冲突", "爽尾钩子", "强字幕句"], "sort_order": 400},
    {"code": "trope_ancient_rebirth_revenge", "label": "古言重生复仇", "dimension": "trope", "aliases": ["古言重生", "嫡女重生", "白莲花", "渣男", "前世惨死"], "sort_order": 410},
    {"code": "trope_urban_rebirth_revenge", "label": "都市重生复仇", "dimension": "trope", "aliases": ["现代重生", "女强重生", "婚礼日重生", "签字日", "前夫家族"], "sort_order": 420},
    {"code": "trope_fake_marriage", "label": "替嫁契约婚", "dimension": "trope", "aliases": ["替嫁", "契约婚", "豪门契约", "王爷契约", "先婚后爱"], "sort_order": 430},
    {"code": "trope_book_villainess", "label": "穿书反派女配", "dimension": "trope", "aliases": ["穿书", "恶毒女配", "反派女配", "原书剧情", "女主光环"], "sort_order": 440},
    {"code": "trope_war_god_return", "label": "都市战神归来", "dimension": "trope", "aliases": ["战神归来", "兵王归来", "隐藏身份", "打脸前妻", "商战逆袭"], "sort_order": 450},
    {"code": "trope_true_daughter_pet", "label": "团宠真千金", "dimension": "trope", "aliases": ["真千金", "假千金", "全家团宠", "失散归来", "身份调换"], "sort_order": 460},
    {"code": "trope_mansion_anti_struggle", "label": "豪门反卷女配", "dimension": "trope", "aliases": ["豪门反卷", "女配躺平", "懒人智慧", "豪门家斗", "躺平"], "sort_order": 470},
    {"code": "trope_era_rebirth", "label": "年代知青重生", "dimension": "trope", "aliases": ["年代文", "知青重生", "70年代", "80年代", "原生家庭"], "sort_order": 480},
    {"code": "trope_hidden_tycoon", "label": "神豪隐世富豪", "dimension": "trope", "aliases": ["神豪", "隐世富豪", "扮猪吃虎", "装穷", "亮身份"], "sort_order": 490},
    {"code": "trope_daddy_with_kid", "label": "奶爸萌宝", "dimension": "trope", "aliases": ["奶爸", "萌宝", "寻母", "单亲奶爸", "温情爽文"], "sort_order": 500},
    {"code": "trope_xianxia_rebirth", "label": "修真玄幻重生", "dimension": "trope", "aliases": ["修真重生", "玄幻重生", "大佬重生", "传承碾压", "重生少年"], "sort_order": 510},
    {"code": "trope_system_face_slap", "label": "系统签到打脸", "dimension": "trope", "aliases": ["系统流", "签到", "任务系统", "打脸系统", "获得超能力"], "sort_order": 520},
    {"code": "trope_suspense_twist", "label": "悬疑反转", "dimension": "trope", "aliases": ["反转再反转", "新线索", "揭晓真凶", "悬疑单元", "真凶"], "sort_order": 530},
    {"code": "trope_sweet_pet_daily", "label": "甜宠日常", "dimension": "trope", "aliases": ["甜宠", "高甜", "独宠", "反差萌", "发糖"], "sort_order": 540},
    {"code": "trope_scifi_mecha", "label": "科幻机甲", "dimension": "trope", "aliases": ["机甲", "太空", "外星", "异形", "敌国战场"], "sort_order": 550},
    {"code": "trope_apocalypse_survival", "label": "末日生存", "dimension": "trope", "aliases": ["末世", "废土", "丧尸", "资源稀缺", "生存"], "sort_order": 560},
    {"code": "trope_school_youth", "label": "校园青春", "dimension": "trope", "aliases": ["高中", "大学校园", "学霸", "校草", "暗恋", "青春疼痛"], "sort_order": 570},
    {"code": "trope_sports_competition", "label": "热血竞技", "dimension": "trope", "aliases": ["篮球", "足球", "电竞", "格斗", "联赛", "菜鸟逆袭"], "sort_order": 580},
    {"code": "trope_infinite_flow", "label": "无限流", "dimension": "trope", "aliases": ["主神空间", "副本世界", "游戏规则", "通关", "副本"], "sort_order": 590},
    {"code": "trope_detective_case", "label": "刑侦探案", "dimension": "trope", "aliases": ["重案组", "法医", "心理侧写", "探案", "单元案"], "sort_order": 600},
    {"code": "trope_entertainment_circle", "label": "娱乐圈", "dimension": "trope", "aliases": ["娱乐圈", "顶流", "过气重生", "撕黑料", "新人逆袭"], "sort_order": 610},
    {"code": "trope_workplace_counterattack", "label": "职场逆袭", "dimension": "trope", "aliases": ["职场逆袭", "高管陷害", "KPI", "专业能力", "职场"], "sort_order": 620},
    {"code": "trope_immortal_cult", "label": "修真宗门", "dimension": "trope", "aliases": ["宗门", "灵根", "渡劫", "飞升", "宗门内斗"], "sort_order": 630},
    {"code": "trope_western_fantasy", "label": "西方奇幻", "dimension": "trope", "aliases": ["魔法", "龙骑士", "骷髅王", "神秘学院", "中世纪"], "sort_order": 640},
    {"code": "trope_western_xuanhuan", "label": "西方玄幻", "dimension": "trope", "aliases": ["西幻", "西方奇幻", "魔法", "狼人", "吸血鬼", "女巫", "龙族", "诅咒"], "sort_order": 641},
    {"code": "trope_supernatural", "label": "超自然", "dimension": "trope", "aliases": ["灵异", "异能", "超能力", "鬼魂", "狼人", "吸血鬼", "诅咒", "神秘力量"], "sort_order": 642},
    {"code": "trope_folk_ghost_demon", "label": "志怪鬼神", "dimension": "trope", "aliases": ["志怪", "捉鬼", "道士", "山海经", "捉妖人"], "sort_order": 650},
    {"code": "trope_daily_healing", "label": "日常治愈", "dimension": "trope", "aliases": ["治愈", "小镇", "田园", "美食店", "人间烟火"], "sort_order": 660},
    {"code": "trope_history_drama", "label": "正史野史", "dimension": "trope", "aliases": ["正史", "野史", "朝堂权谋", "江山美人", "唐宋元明清"], "sort_order": 670},

    {"code": "visual_3d_cn_real", "label": "3D国内真人", "dimension": "visual_medium", "aliases": ["国内真人", "真人短剧", "中文真人"], "sort_order": 300},
    {"code": "visual_3d_oversea_real", "label": "3D海外真人", "dimension": "visual_medium", "aliases": ["海外真人", "欧美真人", "英文真人"], "sort_order": 310},
    {"code": "visual_3d_cn_anim", "label": "3D国漫", "dimension": "visual_medium", "aliases": ["3D动画", "国漫3D"], "sort_order": 320},
    {"code": "visual_2d_cn_anim", "label": "2D国漫", "dimension": "visual_medium", "aliases": ["2D动画", "国漫2D"], "sort_order": 330},
]

STORYBOARD_SUBJECT_LABELS = [
    "慢节奏通用版", "快节奏通用版", "外海广播剧", "清道夫·影视工业化版",
    "古偶权谋", "古装权谋", "历史宫廷", "古偶重生复仇", "宅斗权谋", "恶女高光风",
    "犯罪悬疑", "冷峻现实主义", "西部荒野", "末世废土",
    "仙侠修仙", "东方玄幻", "西方玄幻", "超自然", "机甲科幻", "巨兽战争", "重工业灾难",
    "江湖武林", "传统武侠", "刀剑恩怨",
    "都市逆袭", "豪门打脸", "商业爽剧", "职场反击", "赘婿翻身", "现实爽剧",
    "现代言情", "甜虐拉扯", "破镜重圆", "误会分离", "久别重逢",
    "2D日漫", "赛璐璐动画", "校园青春", "异世界冒险", "都市奇幻", "搞笑日常",
    "2D国漫", "新国风动画", "东方幻想", "水墨厚涂", "古风冒险", "门派恩怨",
    "民国少帅", "军阀言情", "危险甜虐", "霸道少帅",
    "乡村红色", "新乡土现实主义", "暖阳纪实",
    "港式无厘头喜剧", "市井草根喜剧", "小人物逆袭", "校园喜剧", "江湖恶搞",
    "古代悬疑", "县衙断案", "仵作验尸", "密室疑案", "江湖凶案",
    "民国悬疑", "租界探案", "巡捕房刑侦", "旅馆密室",
    "现代刑侦", "审讯对峙", "法证协作",
    "AIGC视频提示词", "镜号小节版",
]

_existing_catalog_labels = {item["label"] for item in TAG_CATALOG}
for _idx, _label in enumerate(STORYBOARD_SUBJECT_LABELS, start=1):
    if _label not in _existing_catalog_labels:
        TAG_CATALOG.append({
            "code": f"story_subject_{_idx:03d}",
            "label": _label,
            "dimension": "genre",
            "aliases": [],
            "sort_order": 700 + _idx,
        })

CATALOG_BY_CODE = {item["code"]: item for item in TAG_CATALOG}
CATALOG_BY_LABEL = {item["label"]: item for item in TAG_CATALOG}
for _item in TAG_CATALOG:
    for _alias in _item.get("aliases") or []:
        CATALOG_BY_LABEL.setdefault(_alias, _item)


def _is_legacy_coarse_genre(item: Dict[str, Any]) -> bool:
    # Coarse genre tags like 古装/情感/宅斗 are no longer exposed; storyboard
    # template title labels are the only topic tags used for matching.
    return str(item.get("code") or "").startswith("genre_")


def _is_public_catalog_item(item: Dict[str, Any]) -> bool:
    return not _is_legacy_coarse_genre(item)


def _public_tag_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Expose legacy trope codes as genre tags; the UI only has audience/topic/visual."""
    if item.get("dimension") != "trope":
        return item
    mapped = dict(item)
    mapped["dimension"] = "genre"
    return mapped


def _json_list(value: Any) -> str:
    if value is None:
        return "[]"
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return json.dumps(parsed, ensure_ascii=False)
        except Exception:
            return json.dumps([value], ensure_ascii=False)
    if isinstance(value, list):
        return json.dumps(value, ensure_ascii=False)
    return "[]"


def _extract_json_object(text: str) -> Optional[dict]:
    if not text:
        return None
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.IGNORECASE | re.MULTILINE).strip()
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else None
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", cleaned)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def normalize_tag(value: Any, dimension: Optional[str] = None) -> Optional[Dict[str, Any]]:
    raw = str(value or "").strip()
    if not raw:
        return None
    item = CATALOG_BY_CODE.get(raw) or CATALOG_BY_LABEL.get(raw)
    if not item:
        return None
    if not _is_public_catalog_item(item):
        return None
    public_item = _public_tag_item(item)
    expected_dimension = "genre" if dimension == "trope" else dimension
    if expected_dimension and public_item.get("dimension") != expected_dimension:
        return None
    return public_item


def _unique_tag_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out = []
    for row in rows:
        code = row.get("code")
        if not code or code in seen:
            continue
        seen.add(code)
        out.append(row)
    return out


class TagService:
    @staticmethod
    def select_analysis_config(configs: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Pick the most suitable text model for lightweight tag analysis."""
        llm_configs = [c for c in configs if str(c.get("config_type") or "llm") == "llm"]
        if not llm_configs:
            return None

        def score(config: Dict[str, Any]) -> int:
            text = " ".join(str(config.get(k) or "").lower() for k in ("name", "base_url", "model_name", "provider_code"))
            value = 0
            if "deepseek" in text:
                value += 100
            if "标签" in text or "tag" in text:
                value += 40
            if "flash" in text or "chat" in text:
                value += 10
            return value

        return sorted(llm_configs, key=lambda c: (score(c), int(c.get("id") or 0)), reverse=True)[0]

    @staticmethod
    async def seed_definitions(db=None) -> None:
        own_db = db is None
        if own_db:
            db = await get_db()
        try:
            now = now_beijing_str()
            for item in TAG_CATALOG:
                public_item = _public_tag_item(item)
                enabled = 1 if _is_public_catalog_item(item) else 0
                await db.execute(
                    """
                    INSERT INTO tag_definitions
                        (code, label, dimension, aliases, description, sort_order, enabled, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(code) DO UPDATE SET
                        label=excluded.label,
                        dimension=excluded.dimension,
                        aliases=excluded.aliases,
                        sort_order=excluded.sort_order,
                        enabled=excluded.enabled,
                        updated_at=excluded.updated_at
                    """,
                    (
                        public_item["code"],
                        public_item["label"],
                        public_item["dimension"],
                        _json_list(item.get("aliases") or []),
                        item.get("description", ""),
                        int(item.get("sort_order") or 0),
                        enabled,
                        now,
                        now,
                    ),
                )
            await db.commit()
        finally:
            if own_db:
                await db.close()

    @staticmethod
    async def list_definitions() -> List[Dict[str, Any]]:
        db = await get_db()
        try:
            await TagService.seed_definitions(db)
            cur = await db.execute(
                """
                SELECT code, label, dimension, aliases, description, sort_order, enabled
                FROM tag_definitions
                WHERE enabled = 1
                ORDER BY dimension, sort_order, label
                """
            )
            rows = []
            for row in await cur.fetchall():
                aliases = []
                try:
                    aliases = json.loads(row["aliases"] or "[]")
                except Exception:
                    aliases = []
                rows.append({
                    "code": row["code"],
                    "label": row["label"],
                    "dimension": row["dimension"],
                    "aliases": aliases,
                    "description": row["description"] or "",
                    "sort_order": row["sort_order"] or 0,
                })
            return rows
        finally:
            await db.close()

    @staticmethod
    def _heuristic_tags(
        name: str,
        content: str,
        selected_visual: Optional[List[str]] = None,
        selected_screen_mode: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        text = f"{name}\n{content or ''}"[:30000]
        rows: List[Dict[str, Any]] = []

        def add(item: Dict[str, Any], score: float, source: str = "heuristic", evidence: str = ""):
            public_item = _public_tag_item(item)
            rows.append({
                "code": public_item["code"],
                "label": public_item["label"],
                "dimension": public_item["dimension"],
                "score": score,
                "source": source,
                "evidence": evidence,
            })

        for label in selected_visual or []:
            item = normalize_tag(label, "visual_medium")
            if item:
                add(item, 1.0, "manual", "用户选择的大方向标签")

        for label in selected_screen_mode or []:
            item = normalize_tag(label, "screen_mode")
            if item:
                add(item, 1.0, "manual", "用户选择的屏幕模式")

        for item in TAG_CATALOG:
            if not _is_public_catalog_item(item):
                continue
            if item["dimension"] in ("visual_medium", "screen_mode"):
                continue
            hits = []
            for kw in [item["label"]] + list(item.get("aliases") or []):
                if kw and kw in text:
                    hits.append(kw)
            if hits:
                add(item, min(0.95, 0.58 + 0.08 * len(hits)), "heuristic", "、".join(hits[:5]))

        if not any(r["dimension"] == "audience" for r in rows):
            add(CATALOG_BY_CODE["audience_general"], 0.5, "heuristic", "未识别明确男女频,默认通用")
        return _unique_tag_rows(rows)

    @staticmethod
    async def analyze_content(
        name: str,
        content: str,
        selected_visual: Optional[List[str]] = None,
        selected_screen_mode: Optional[List[str]] = None,
        mode: str = "",
        novel_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        selected_visual = (selected_visual or [])[:1]
        selected_screen_mode = (selected_screen_mode or [])[:1]
        fallback_rows = TagService._heuristic_tags(name, content, selected_visual, selected_screen_mode)
        catalog_text = "\n".join(
            f"- {_public_tag_item(item)['dimension']} | {item['label']} | aliases: {'、'.join(item.get('aliases') or [])}"
            for item in TAG_CATALOG
            if _is_public_catalog_item(item) and item.get("dimension") != "screen_mode"
        )
        sample = (content or "")[:12000]
        messages = [
            {
                "role": "system",
                "content": (
                    "你是短剧/小说内容标签分析器。只能从给定标签库中选择标签。"
                    "注意: 女频/男频/通用是 audience, 其余题材、时代、风格、情节类型都归入 genre。"
                    "不能把 audience 和 genre 合并成女频-宅斗这类单标签。"
                    "visual_medium 只可建议,最终以用户选择为准。返回严格 JSON。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"标签库:\n{catalog_text}\n\n"
                    f"作品名称:{name}\n来源类型:{mode}\n正文样本:\n{sample}\n\n"
                    "请返回 JSON: {\"audience\":[{\"label\":\"女频\",\"score\":0.8,\"evidence\":\"...\"}],"
                    "\"genre\":[{\"label\":\"宅斗权谋\",\"score\":0.8,\"evidence\":\"...\"},{\"label\":\"古言重生复仇\",\"score\":0.8,\"evidence\":\"...\"}],"
                    "\"visual_suggestion\":[{\"label\":\"3D国内真人\",\"score\":0.8,\"evidence\":\"...\"}]}"
                ),
            },
        ]

        llm_rows: List[Dict[str, Any]] = []
        error = ""
        try:
            from services.llm_service import LLMService

            configs = await LLMService.get_all("llm")
            config = TagService.select_analysis_config(configs)
            config_id = config.get("id") if isinstance(config, dict) else None
            if config_id:
                raw = await LLMService.call_llm(
                    config_id=config_id,
                    messages=messages,
                    temperature=0.1,
                    max_tokens=1200,
                    timeout=180,
                    task_type="tag_analysis",
                    novel_id=novel_id,
                    source_type="novel_tag_analysis",
                )
                data = _extract_json_object(raw or "") or {}
                for dim_key, dimension in (("audience", "audience"), ("genre", "genre"), ("trope", "genre"), ("visual_suggestion", "visual_medium")):
                    values = data.get(dim_key) or []
                    if isinstance(values, str):
                        values = [values]
                    for item in values:
                        if isinstance(item, dict):
                            label = item.get("label") or item.get("tag") or item.get("name")
                            score = item.get("score", 0.7)
                            evidence = item.get("evidence", "")
                        else:
                            label = item
                            score = 0.7
                            evidence = ""
                        tag = normalize_tag(label, dimension)
                        if not tag:
                            continue
                        if dimension == "visual_medium":
                            # Visual direction is selected by the user only; LLM may not auto-fill it.
                            continue
                        llm_rows.append({
                            "code": tag["code"],
                            "label": tag["label"],
                            "dimension": tag["dimension"],
                            "score": float(score or 0.7),
                            "source": "llm",
                            "evidence": str(evidence or ""),
                        })
        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"
            logger.warning("[tag-analysis] LLM 分析失败,使用关键词兜底: %s", error)

        manual_rows = [r for r in fallback_rows if r["dimension"] in ("visual_medium", "screen_mode")]
        base_rows = llm_rows if llm_rows else [r for r in fallback_rows if r["dimension"] not in ("visual_medium", "screen_mode")]
        rows = _unique_tag_rows(manual_rows + base_rows)
        return {
            "tags": rows,
            "source": "llm" if llm_rows else "heuristic",
            "error": error,
        }

    @staticmethod
    async def save_novel_tags(novel_id: int, tags: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        db = await get_db()
        try:
            await TagService.seed_definitions(db)
            now = now_beijing_str()
            # 只替换本体系标签,不影响未来别的扩展维度。
            await db.execute(
                "DELETE FROM novel_tags WHERE novel_id = ? AND dimension IN ('audience','genre','trope','visual_medium','screen_mode')",
                (novel_id,),
            )
            saved = []
            visual_saved = False
            screen_saved = False
            for raw in tags:
                item = normalize_tag(raw.get("code") or raw.get("label"), raw.get("dimension"))
                if not item:
                    continue
                if item["dimension"] == "visual_medium":
                    if visual_saved:
                        continue
                    visual_saved = True
                if item["dimension"] == "screen_mode":
                    if screen_saved:
                        continue
                    screen_saved = True
                score = float(raw.get("score", 1.0) or 1.0)
                source = str(raw.get("source") or "manual")
                evidence = str(raw.get("evidence") or "")
                await db.execute(
                    """
                    INSERT INTO novel_tags
                        (novel_id, tag_code, label, dimension, score, source, evidence, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(novel_id, tag_code) DO UPDATE SET
                        label=excluded.label,
                        dimension=excluded.dimension,
                        score=excluded.score,
                        source=excluded.source,
                        evidence=excluded.evidence,
                        updated_at=excluded.updated_at
                    """,
                    (novel_id, item["code"], item["label"], item["dimension"], score, source, evidence, now, now),
                )
                saved.append({
                    "code": item["code"],
                    "label": item["label"],
                    "dimension": item["dimension"],
                    "score": score,
                    "source": source,
                    "evidence": evidence,
                })
            await db.execute("UPDATE novels SET updated_at=? WHERE id=?", (now, novel_id))
            await db.commit()
            return saved
        finally:
            await db.close()

    @staticmethod
    async def get_novel_tags(novel_id: int) -> List[Dict[str, Any]]:
        db = await get_db()
        try:
            cur = await db.execute(
                """
                SELECT tag_code, label, dimension, score, source, evidence, updated_at
                FROM novel_tags
                WHERE novel_id = ?
                ORDER BY dimension, score DESC, label
                """,
                (novel_id,),
            )
            rows = []
            for row in await cur.fetchall():
                item = CATALOG_BY_CODE.get(row["tag_code"]) or CATALOG_BY_LABEL.get(row["label"])
                if item and not _is_public_catalog_item(item):
                    continue
                dimension = row["dimension"] or ""
                if dimension == "trope":
                    dimension = "genre"
                rows.append({
                    "code": row["tag_code"],
                    "label": row["label"],
                    "dimension": dimension,
                    "score": row["score"],
                    "source": row["source"],
                    "evidence": row["evidence"] or "",
                    "updated_at": row["updated_at"],
                })
            return rows
        finally:
            await db.close()

    @staticmethod
    async def has_required_visual_tag(novel_id: int) -> bool:
        tags = await TagService.get_novel_tags(novel_id)
        return any(str(tag.get("dimension") or "") == "visual_medium" for tag in tags)

    @staticmethod
    def missing_required_conversion_tags(tags: List[Dict[str, Any]]) -> List[str]:
        has_screen = any(str(tag.get("dimension") or "") == "screen_mode" for tag in tags)
        has_visual = any(str(tag.get("dimension") or "") == "visual_medium" for tag in tags)
        has_content_tag = any(str(tag.get("dimension") or "") in ("audience", "genre", "trope") for tag in tags)
        missing = []
        if not has_screen:
            missing.append("屏幕模式")
        if not has_visual:
            missing.append("视觉标签")
        if not has_content_tag:
            missing.append("受众/题材标签")
        return missing

    @staticmethod
    async def get_missing_required_conversion_tags(novel_id: int) -> List[str]:
        tags = await TagService.get_novel_tags(novel_id)
        return TagService.missing_required_conversion_tags(tags)

    @staticmethod
    async def require_conversion_tags(novel_id: int) -> None:
        missing = await TagService.get_missing_required_conversion_tags(novel_id)
        if not missing:
            return
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400,
            detail={
                "code": "NOVEL_TAG_REQUIRED",
                "message": f"该小说缺少{'和'.join(missing)}，请先到小说导入页完成标签设置后再继续。",
                "missing_tags": missing,
                "novel_id": novel_id,
            },
        )

    @staticmethod
    async def require_visual_tag(novel_id: int) -> None:
        if await TagService.has_required_visual_tag(novel_id):
            return
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400,
            detail={
                "code": "NOVEL_TAG_REQUIRED",
                "message": "该小说还未设置视觉标签，请先到小说导入页完成标签设置后再继续。",
                "novel_id": novel_id,
            },
        )

    @staticmethod
    async def analyze_and_save(
        novel_id: int,
        name: str,
        content: str,
        selected_visual: Optional[List[str]] = None,
        selected_screen_mode: Optional[List[str]] = None,
        mode: str = "",
    ) -> Dict[str, Any]:
        result = await TagService.analyze_content(
            name=name,
            content=content,
            selected_visual=selected_visual,
            selected_screen_mode=selected_screen_mode,
            mode=mode,
            novel_id=novel_id,
        )
        saved = await TagService.save_novel_tags(novel_id, result.get("tags") or [])
        return {**result, "tags": saved}
