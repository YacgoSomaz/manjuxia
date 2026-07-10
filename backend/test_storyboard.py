import asyncio
import sys
import sqlite3
import json

# 添加当前目录到路径，确保能导入 services
sys.path.insert(0, 'e:\\workspace\\xiaoshuotool\\backend')

from services.llm_service import LLMService

# 测试用的剧本内容
SCRIPT_CONTENT = """【外 忠勇侯府门前 春日 日】

春光明媚，微风拂过翠绿的柳枝。几辆装饰考究的马车停靠在石狮子旁。

几名身着锦衣华裳的贵族千金正聚在一起掩唇娇笑，互相打量把玩着手中的绢扇。

一辆装饰着金丝流苏、极其奢华的宽大马车碾过青石板路，缓缓驶来。

贵女们的笑容瞬间僵在脸上，纷纷收起绢扇，后退半步，低下头，眼神中交织着畏惧与暗自打量的嫉妒。

贵女甲（压低声音，紧张）："是安国公府的马车……凌瑶华来了。"

贵女乙（撇嘴，极小声）："这京城第一恶女，谁敢惹她。上次李家姐姐不过穿了件与她同色的衣服，父兄就被安国公参了一本，连官职都丢了。"



【内 凌瑶华的马车内 日】

鎏金般的阳光透过车帘缝隙，照在凌瑶华绝美的脸上。

她猛地睁开双眼，胸口剧烈起伏，眼神中满是惊恐与涣散。她下意识地蜷缩起身子，双手死死抱住头，额头渗出冷汗。

【闪回画面：内 阴暗地牢 夜】

阴冷潮湿的石墙上挂着烧红的烙铁，火星迸溅。一双满是血污、指甲被全部拔光的手无力地垂落在散发着恶臭的枯草堆上。

【画面切回：内 凌瑶华的马车内 日】

凌瑶华大口喘息着，猛地伸出手，死死抓住身旁丫鬟青竹的手腕。

青竹吃痛，惊愕地看着凌瑶华。

凌瑶华低头看向自己的双手。十指纤纤，嫩粉色的蔻丹完好无损，指节上戴着各色宝石戒指，没有半点腐烂流脓的伤痕。

她双手颤抖着抚摸自己的脸颊，肌肤光滑细腻。

凌瑶华（急促发抖）："镜子！镜子呢！"

青竹慌忙从怀中掏出一面精致的铜镜递过去。

凌瑶华一把夺过铜镜。镜中映出一张肌肤莹白、美艳无双的少女面庞。

她用长指甲狠狠掐入掌心，眉头因疼痛微微蹙起，随即眼底涌起狂喜与不可置信的泪光。



【外 忠勇侯府门前 日】

青竹率先跳下马车，挑开锦帘。凌瑶华搭着青竹的手缓缓走下。

门前的贵女们立刻换上谄媚的笑脸，如潮水般涌上前，将她团团围住。

贵女甲（满脸堆笑）："凌姐姐今日这身妆扮真是艳冠群芳，叫妹妹们好生羡慕。"

凌瑶华冷眼环视着这群人，眼神恍惚。

【闪回画面：内 阴暗地牢 夜】

几个身穿华服的女子站在牢门外，用帕子捂着口鼻，指着地上血肉模糊的凌瑶华放肆大笑。

【画面切回：外 忠勇侯府门前 日】

凌瑶华眼底的恍惚瞬间化为极致的冰冷。

人群外，一抹绛紫色的衣角步入视线。容景琛头戴玉冠，面容俊美孤傲，负手走来。

众人纷纷退开让出一条路，屈膝行礼。

贵女们（齐声恭敬）："见过王爷。"

凌瑶华缓缓抬起眼眸，死死盯着容景琛。

【闪回画面：外 国公府大院 阴】

大雨倾盆，安国公府的牌匾被粗暴砸碎在泥水里。容景琛撑着伞，冷漠地站在一旁，将一件名贵的披风披在一个柔弱女子的肩上。

【画面切回：外 忠勇侯府门前 日】

凌瑶华的双手在袖中紧紧攥成拳，指甲几乎陷入肉里，黑白分明的眼眸中翻涌着毫不掩饰的刺骨恨意。

容景琛眉头微皱，对上凌瑶华的视线，眼中闪过一丝疑惑。他目光越过凌瑶华，扫向她身后的马车。

容景琛（平淡带疑）："婉兮呢？她怎么没来？"

凌瑶华冷笑一声，微微扬起下巴。

凌瑶华（极其冰冷）："我又不是凌婉兮的娘，她在哪我怎么知道？"

容景琛愣在原地，脸色瞬间变得有些难看。周围的贵女们纷纷倒吸一口凉气，把头埋得更低了。



一阵微风拂过，不远处传来细碎的脚步声。

凌婉兮（柔弱轻细）："二妹妹……"

凌瑶华身子一僵，眼底杀意骤起。

凌婉兮身穿一袭青色长裙，发丝微乱，额头上布满细密的汗珠，正提着裙摆气喘吁吁地小跑过来。丫鬟望儿紧紧跟在身后。

贵女乙（极小声对旁边人嘀咕）："这二房刚寻回一年的真千金怎么跑着来了？"

容景琛立刻迎上前，眉头舒展，眼中满是怜惜。

容景琛（关切）："婉兮，你为何气喘吁吁，发生了何事？"

凌婉兮看了一眼凌瑶华，迅速低下头，嘴角扯出一抹勉强的笑意，轻轻摇了摇头。

容景琛眼神一沉，转头狠狠瞪向凌瑶华。

容景琛（笃定愠怒）："你又欺负婉兮了？"

凌婉兮连连摆手，脸色苍白，肩膀微微瑟缩。

望儿（忿忿不平）："回王爷！是大小姐的马车坏了，但二小姐不肯载大小姐一道，大小姐只能步行赶来。"

凌婉兮（急切制止）："望儿！不得乱说，想来二妹妹是没瞧见我。"

望儿（咬牙不甘）："您还亲自询问二小姐能不能顺路带您，她怎么可能没看见！"

凌婉兮急得跺了跺脚，眼眶泛红，泪水在眼底打转。她转头看向凌瑶华，双手不安地绞着手中的丝帕。

凌婉兮（自责委屈）："二妹妹，你相信我，我没想与王爷说这些的。"



凌瑶华微微眯起眼睛，冷冷地看着凌婉兮。

【闪回画面：内 阴暗地牢 夜】

凌婉兮一身华丽宫装，站在满身伤痕的凌瑶华面前，眼角挂着泪水，手里却递过两本厚厚的经书。凌瑶华张开干裂的嘴唇吐出一口带血的唾沫，凌婉兮立刻捂住胸口，双眼一翻晕倒在丫鬟怀里。一旁的狱卒立刻抽出带着倒刺的皮鞭，狠狠抽向凌瑶华。

【画面切回：外 忠勇侯府门前 日】

容景琛看着凌婉兮委屈的模样，怒火中烧，指着凌瑶华。

容景琛（厉声）："你们是同府姐妹，你怎忍心如此欺她！亏得婉兮处处替你着想替你隐瞒，你真是太让我失望了！"



凌瑶华深吸一口气，缓缓闭上眼睛，再睁开时，眼底的阴霾尽数敛去，换上了一副温婉平和的神情。

她提起裙摆，迈着优雅的步伐，一步步走到凌婉兮面前。

凌婉兮眼中闪过一丝慌乱，随即仰起头，眼含水光。

凌婉兮（柔声婉转）："二妹妹……"

凌瑶华嘴角勾起一抹明艳至极的笑容。她猛地扬起右手，在半空中划过一道凌厉的弧线。

清脆的巴掌声重重回荡在侯府门前。

凌婉兮被打得身子猛地一偏，发髻散乱，捂着脸呆滞在原地。容景琛和周围的贵女们全部瞪大双眼，满脸惊骇。

凌瑶华甩了甩震得发麻的右手，慢条斯理地抚平衣袖上的褶皱。她脸上的笑意越发明媚张扬，眼神中透着睥睨一切的疯狂与决绝。"""


async def test_storyboard_generation():
    """测试分镜生成的大模型调用"""
    
    print("=" * 60)
    print("开始测试分镜生成 - 大模型调用")
    print("=" * 60)
    
    # 1. 从数据库读取模板内容
    print("\n[1] 从数据库读取即梦2.0分镜模板...")
    conn = sqlite3.connect('data/app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, content, variables FROM prompt_templates WHERE id = 5;")
    template_row = cursor.fetchone()
    conn.close()
    
    if not template_row:
        print("[错误] 找不到即梦2.0分镜模板 (ID=5)")
        return
    
    template_id, template_name, template_content, template_variables = template_row
    print(f"  模板ID: {template_id}")
    print(f"  模板名称: {template_name}")
    print(f"  模板变量: {template_variables}")
    print(f"  模板内容长度: {len(template_content)} 字符")
    
    # 2. 构建 prompt
    print("\n[2] 构建 prompt...")
    # 模板没有定义变量，直接将剧本内容追加到模板后面
    prompt = f"{template_content}\n\n{SCRIPT_CONTENT}"
    print(f"  最终 prompt 长度: {len(prompt)} 字符")
    print(f"  Prompt 前300字符:\n{prompt[:300]}...")
    
    # 3. 获取 LLM 配置 (使用 glm-5, ID=7)
    print("\n[3] 获取 LLM 配置...")
    conn = sqlite3.connect('data/app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, model_name, base_url FROM llm_configs WHERE id = 7;")
    config_row = cursor.fetchone()
    conn.close()
    
    if not config_row:
        print("[错误] 找不到 LLM 配置 (ID=7)")
        return
    
    llm_config_id, config_name, model_name, base_url = config_row
    print(f"  配置ID: {llm_config_id}")
    print(f"  配置名称: {config_name}")
    print(f"  模型: {model_name}")
    print(f"  Base URL: {base_url}")
    
    # 4. 调用大模型
    print("\n[4] 调用大模型 (超时设置: 300秒)...")
    print("  正在发送请求，请耐心等待...")
    
    messages = [
        {"role": "system", "content": "你是一位专业的分镜设计助手，请将剧本内容转换为详细的分镜列表。支持两种返回格式：1) 按小节分组的格式，包含section_number、scene（场景）、characters（人物）和shots（镜号列表）；2) 扁平列表格式。每个分镜应包含scene_number/shot_number、description（画面描述）、camera（镜头语言）、dialogue（对白）、prompt（AI绘图提示词）。请确保返回有效的JSON格式。"},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await LLMService.call_llm(
            config_id=llm_config_id,
            messages=messages,
            timeout=300,
            max_tokens=8192
        )
        
        print("\n" + "=" * 60)
        print("=== 调用成功 ===")
        print("=" * 60)
        print(f"\n响应内容长度: {len(response)} 字符")
        print(f"\n完整响应内容:\n{'-' * 60}")
        print(response)
        print(f"{'-' * 60}")
        
        # 尝试解析响应
        print("\n[5] 尝试解析响应...")
        from services.utils import parse_storyboard_response
        storyboards = parse_storyboard_response(response)
        print(f"  解析到 {len(storyboards)} 个分镜/小节")
        
        if storyboards:
            print(f"\n  第一个分镜/小节预览:")
            print(f"  {json.dumps(storyboards[0], ensure_ascii=False, indent=2)[:500]}...")
        
    except Exception as e:
        print("\n" + "=" * 60)
        print("=== 调用失败 ===")
        print("=" * 60)
        print(f"\n错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"\n完整堆栈:\n{traceback.format_exc()}")


if __name__ == "__main__":
    asyncio.run(test_storyboard_generation())
