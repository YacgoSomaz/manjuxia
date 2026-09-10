import os
import sys
import unittest
from unittest.mock import AsyncMock, patch


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from api.video import (
    _build_final_video_prompt,
    _extract_section_duration,
)
from services.storyboard_service import StoryboardService


def _shot(
    number: int,
    start: str,
    end: str,
    *,
    dialogue: str = "无",
    voice_id: str = "V001",
) -> str:
    if dialogue == "无":
        voice_line = "台词/OS/口型:无"
    else:
        voice_line = (
            "台词/OS/口型:类型=现场台词/角色=凌婉兮:"
            f"「{dialogue}」〔{voice_id}｜有效区间={start}-{end}"
            "｜声线=克制决绝｜对象=薛北｜重音与停连=自然停连｜口型=同步〕"
        )
    return "\n".join(
        (
            f"镜头{number}｜{start}-{end}｜近景 · 说话人态度 · 否",
            "本镜人物白名单:本镜可见人物=凌婉兮 / 本镜局部可见人物=无 / "
            "本镜新入场人物=无 / 本镜退场人物=无 / 本镜画外声源=无 / "
            "本镜启用角色参考=凌婉兮",
            "画面/构图提示词:场景=废驿二楼 / 载体=近景 / 几何=人物居中 / "
            "视线=看向画右薛北 / 前景=虚化窗棂 / 背景=林叶低幅摇动",
            "动作/表演/关系:主动作=抬眼 / 表情链=迟疑到决绝 / "
            "接收反应=呼吸停半拍 / 手部=攥紧衣袖 / 关系=试探 / 收口=视线定住",
            "动态背景/氛围动作:环境=林叶低幅摇动 / 发丝=鬓发轻动 / "
            "衣饰=衣袖轻摆 / 前景收口=虚化窗棂掠过",
            "道具交互/连续性:核心证据=无 / 辅助道具=无 / 取递接=无",
            "光影/质感/脸部读性:主光=冷白漫射侧光 / 辅助光=无 / "
            "白平衡曝光=同场统一 / 环境反射=木构暖反射 / 色彩=冷白枯褐 / "
            "图案光=窗棂淡影 / 脸=双眼清晰",
            "运镜/动作衔接:机位=平视 / 路径=低幅慢推 / 切镜=视线落定后切",
            voice_line,
            "本镜人声审计:覆盖V=V001 / Cmin=3.00秒 / 过载=通过",
            "后期声音:环境音效=林风 / 动作音效=衣料轻响 / "
            "情绪音效=低沉重击 / 声音衔接=风声延续",
            "特殊降噪:禁字幕、画面文字、水印、logo、UI",
        )
    )


def _section(
    *,
    title_duration: str,
    shots: list[str],
    footer_duration: str,
    voice_mode: str = "",
) -> str:
    mode_line = f"人声送模模式:{voice_mode}\n" if voice_mode else ""
    return (
        f"【外 北林西口废驿 日 · 设局收网 · {title_duration}秒 · 谋权正剧】\n"
        f"{mode_line}"
        "【本节声音基准】本节声源权威=林风 / 混音优先级=人声＞动作音＞环境音\n"
        + "\n\n".join(shots)
        + "\n\n本节统一降噪提示词:禁字幕、画面文字、水印、logo、UI\n"
        + f"📏 本小节总时长:{footer_duration} 秒"
    )


class StructuredSectionDurationTests(unittest.TestCase):
    def test_rejects_22_second_body_with_15_second_footer(self):
        text = _section(
            title_duration="22.0",
            shots=[
                _shot(1, "00:00.0", "00:12.0"),
                _shot(2, "00:12.0", "00:22.0"),
            ],
            footer_duration="15",
        )

        with self.assertRaisesRegex(ValueError, "未完成真实拆节"):
            StoryboardService._postprocess_text_sections(
                [{"section_number": 1, "section_info": {}, "full_text": text}]
            )

    def test_accepts_fractional_section_with_integer_provider_footer(self):
        text = _section(
            title_duration="12.5",
            shots=[
                _shot(1, "00:00.0", "00:05.0"),
                _shot(2, "00:05.0", "00:12.5"),
            ],
            footer_duration="13",
        )

        StoryboardService._validate_structured_section_duration(text, 15)

    def test_accepts_cumulative_timecodes_for_a_later_section(self):
        text = _section(
            title_duration="9.5",
            shots=[
                _shot(1, "00:12.5", "00:18.0"),
                _shot(2, "00:18.0", "00:22.0"),
            ],
            footer_duration="10",
        )

        StoryboardService._validate_structured_section_duration(text, 15)

    def test_current_protocol_parses_two_complete_sections(self):
        first = _section(
            title_duration="12.5",
            shots=[_shot(1, "00:00.0", "00:12.5")],
            footer_duration="13",
        )
        second = _section(
            title_duration="9.5",
            shots=[_shot(1, "00:12.5", "00:22.0")],
            footer_duration="10",
        )

        sections = StoryboardService._parse_text_sections(first + "\n\n" + second)
        output = StoryboardService._postprocess_text_sections(sections)

        self.assertEqual(len(output), 2)
        self.assertTrue(output[0]["full_text"].rstrip().endswith("📏 本小节总时长:13 秒"))
        self.assertTrue(output[1]["full_text"].rstrip().endswith("📏 本小节总时长:10 秒"))

    def test_rejects_gap_between_shots(self):
        text = _section(
            title_duration="10.0",
            shots=[
                _shot(1, "00:00.0", "00:05.0"),
                _shot(2, "00:06.0", "00:10.0"),
            ],
            footer_duration="10",
        )

        with self.assertRaisesRegex(ValueError, "时间码不连续"):
            StoryboardService._validate_structured_section_duration(text, 15)

    def test_seedance_25_accepts_one_complete_30_second_section(self):
        text = _section(
            title_duration="30.0",
            shots=[
                _shot(1, "00:00.0", "00:15.0"),
                _shot(2, "00:15.0", "00:30.0"),
            ],
            footer_duration="30",
        )

        output = StoryboardService._postprocess_text_sections(
            [{"section_number": 1, "section_info": {}, "full_text": text}],
            max_section_duration_sec=30,
        )

        self.assertEqual(len(output), 1)
        self.assertIn("00:15.0-00:30.0", output[0]["full_text"])
        self.assertTrue(
            output[0]["full_text"].rstrip().endswith("📏 本小节总时长:30 秒")
        )

    def test_same_30_second_structured_section_is_rejected_for_seedance_20(self):
        text = _section(
            title_duration="30.0",
            shots=[
                _shot(1, "00:00.0", "00:15.0"),
                _shot(2, "00:15.0", "00:30.0"),
            ],
            footer_duration="30",
        )

        with self.assertRaisesRegex(ValueError, "超过15秒"):
            StoryboardService._postprocess_text_sections(
                [{"section_number": 1, "section_info": {}, "full_text": text}],
                max_section_duration_sec=15,
            )

    def test_parser_propagates_seedance_25_limit_into_postprocessing(self):
        text = _section(
            title_duration="30.0",
            shots=[
                _shot(1, "00:00.0", "00:15.0"),
                _shot(2, "00:15.0", "00:30.0"),
            ],
            footer_duration="30",
        )

        output = StoryboardService._parse_sections_from_response(
            text,
            max_section_duration_sec=30,
        )

        self.assertEqual(len(output), 1)
        self.assertIn("00:15.0-00:30.0", output[0]["full_text"])

    def test_legacy_30_second_section_only_splits_for_seedance_20(self):
        section = {
            "section_number": 1,
            "section_info": {},
            "full_text": (
                "场景：庭院\n"
                "镜号1:[00:00-00:15] 前半段动作\n"
                "镜号2:[00:15-00:30] 后半段动作\n"
                "📏 本小节总时长:30 秒"
            ),
        }

        seedance_20 = StoryboardService._postprocess_text_sections(
            [section],
            max_section_duration_sec=15,
        )
        seedance_25 = StoryboardService._postprocess_text_sections(
            [section],
            max_section_duration_sec=30,
        )

        self.assertEqual(len(seedance_20), 2)
        self.assertEqual(len(seedance_25), 1)
        self.assertTrue(
            seedance_25[0]["full_text"].rstrip().endswith(
                "📏 本小节总时长:30 秒"
            )
        )


class VideoPromptDurationTests(unittest.TestCase):
    def test_fractional_visual_duration_uses_provider_ceiling(self):
        self.assertEqual(
            _extract_section_duration("📏 本小节总时长:12.5 秒"),
            13,
        )

    def test_seedance_25_duration_is_not_capped_back_to_15(self):
        self.assertEqual(
            _extract_section_duration(
                "📏 本小节总时长:30 秒",
                max_duration_sec=30,
            ),
            30,
        )
        self.assertEqual(
            _extract_section_duration("📏 本小节总时长:30 秒"),
            15,
        )


class _EmptyCursor:
    async def fetchone(self):
        return None


class _EmptyDatabase:
    async def execute(self, *_args, **_kwargs):
        return _EmptyCursor()

    async def close(self):
        return None


class StructuredVideoPromptPassthroughTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_providers_keep_template_process_fields(self):
        text = _section(
            title_duration="3.0",
            shots=[
                _shot(
                    1,
                    "00:00.0",
                    "00:03.0",
                    dialogue="我被共感娃娃上的第三只手摸醒了。",
                )
            ],
            footer_duration="3",
        ).replace(
            "接收反应=呼吸停半拍",
            "接收反应=新建E001＋听见触碰后瞳孔骤缩",
        )
        text += "\n本节资产账本:人物=云瓷 / 道具=命偶"

        for provider_type in (
            None,
            "jimeng",
            "dreamina",
            "cool",
            "pippit",
            "pippit_cli",
            "minimax_h3",
        ):
            with self.subTest(provider_type=provider_type):
                with patch(
                    "api.video.get_db",
                    new=AsyncMock(return_value=_EmptyDatabase()),
                ):
                    output = await _build_final_video_prompt(
                        1,
                        text,
                        provider_type=provider_type,
                    )

                self.assertIn("本镜人声审计:", output)
                self.assertIn("Cmin=3.00秒", output)
                self.assertIn("V001", output)
                self.assertIn("E001", output)
                self.assertIn("本节资产账本:", output)
                self.assertIn("我被共感娃娃上的第三只手摸醒了。", output)
                self.assertNotIn("一句话概述：", output)
                self.assertNotIn("全局补充：", output)


if __name__ == "__main__":
    unittest.main()
