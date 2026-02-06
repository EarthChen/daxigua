#!/usr/bin/env python3
"""
微信小游戏备案信息自动化填写脚本 v4

使用 launch_persistent_context 保持登录状态。
以 headed 模式运行。

Usage:
    source .venv-playwright/bin/activate
    PYTHONUNBUFFERED=1 python scripts/fill_beian.py
"""

import asyncio
import json
import time
import re
from pathlib import Path

from playwright.async_api import async_playwright, Page

GAME = {
    "appid": "wx19c7816c053103f0",
    "name": "合成大西瓜",
    "description": (
        "合成大西瓜是一款休闲益智合成类小游戏。"
        "玩家通过控制水果下落位置，将两个相同的水果合并为更大的水果来获得分数，"
        "最终目标是合成出最大的西瓜。游戏操作简单，适合所有年龄段的用户。"
    ),
    "game_type": "休闲益智",
}

MP = "https://mp.weixin.qq.com"
DIR = Path(__file__).parent.parent
SS_DIR = DIR / "screenshots"
SS_DIR.mkdir(exist_ok=True)


async def ss(page, name):
    p = SS_DIR / f"{name}_{int(time.time())}.png"
    try:
        await page.screenshot(path=str(p), full_page=True)
        print(f"  📸 {p.name}")
    except Exception as e:
        print(f"  ⚠️ 截图失败: {e}")


async def deep_scan(page):
    """深度扫描页面"""
    result = {"url": page.url, "title": await page.title(), "frames": []}
    for i, frame in enumerate(page.frames):
        fi = {"idx": i, "url": frame.url, "main": frame == page.main_frame, "els": {}, "total": 0}
        try:
            fi["els"] = await frame.evaluate("""() => {
                const r = {inputs:[], selects:[], textareas:[], buttons:[], radios:[], labels:[], texts:[]};
                document.querySelectorAll('input:not([type="hidden"])').forEach(el => {
                    r.inputs.push({t:el.type||'text', n:el.name, id:el.id, ph:el.placeholder, v:el.value});
                });
                document.querySelectorAll('select').forEach(el => {
                    r.selects.push({n:el.name, opts:Array.from(el.options).slice(0,15).map(o=>o.text)});
                });
                document.querySelectorAll('textarea').forEach(el => {
                    r.textareas.push({n:el.name, id:el.id, ph:el.placeholder});
                });
                document.querySelectorAll('button,[role="button"],[class*="btn"]:not(input)').forEach(el => {
                    const t = el.textContent?.trim();
                    if (t && t.length > 0 && t.length < 60) r.buttons.push(t);
                });
                document.querySelectorAll('input[type="radio"]').forEach(el => {
                    r.radios.push({n:el.name, v:el.value, ck:el.checked,
                        lbl:(el.closest('label')?.textContent||el.parentElement?.textContent||'').trim().substring(0,60)});
                });
                document.querySelectorAll('label,[class*="label"],[class*="form__label"]').forEach(el => {
                    const t = el.textContent?.trim();
                    if (t && t.length > 0 && t.length < 80) r.labels.push(t);
                });
                // 页面上所有可见文本
                const seen = new Set();
                const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                let node;
                while (node = walk.nextNode()) {
                    const t = node.textContent.trim();
                    if (t && t.length > 1 && t.length < 150) {
                        const p = node.parentElement;
                        if (p && getComputedStyle(p).display !== 'none' && !seen.has(t)) {
                            seen.add(t);
                            r.texts.push(t);
                        }
                    }
                }
                r.texts = r.texts.slice(0, 80);
                return r;
            }""")
            fi["total"] = sum(len(v) for k, v in fi["els"].items() if isinstance(v, list) and k != "texts")
        except Exception as e:
            fi["error"] = str(e)
        result["frames"].append(fi)
    return result


async def try_fill(frame, label, value, tag="input"):
    try:
        r = await frame.evaluate("""({l, t}) => {
            for (const el of document.querySelectorAll('label,[class*="label"]')) {
                if (!el.textContent.includes(l)) continue;
                const g = el.closest('[class*="form"],[class*="group"],[class*="item"],[class*="row"]') || el.parentElement;
                if (g) {
                    const inp = g.querySelector(t);
                    if (inp) { inp.setAttribute('data-pw','1'); return {ok:1}; }
                }
            }
            for (const el of document.querySelectorAll(t)) {
                if ((el.placeholder||'').includes(l)) { el.setAttribute('data-pw','1'); return {ok:1}; }
            }
            return {ok:0};
        }""", {"l": label, "t": tag})
        if r and r.get("ok"):
            await frame.fill('[data-pw="1"]', value)
            await frame.evaluate("document.querySelector('[data-pw]')?.removeAttribute('data-pw')")
            print(f"    ✅ {label}: {value[:35]}...")
            return True
    except Exception as e:
        pass
    return False


async def try_click(frame, text):
    try:
        r = await frame.evaluate("""(t) => {
            for (const el of document.querySelectorAll('input[type="radio"],input[type="checkbox"],label,button,[role="button"],[class*="radio"],[class*="option"],[class*="tag"],a')) {
                if ((el.textContent||'').trim().includes(t)) {
                    el.setAttribute('data-pw-c','1');
                    return {ok:1, t:(el.textContent||'').trim().substring(0,40)};
                }
            }
            return {ok:0};
        }""", text)
        if r and r.get("ok"):
            await frame.click('[data-pw-c="1"]')
            await frame.evaluate("document.querySelector('[data-pw-c]')?.removeAttribute('data-pw-c')")
            print(f"    ✅ 点击: {r.get('t', text)}")
            return True
    except:
        pass
    return False


async def run():
    print(f"""
╔══════════════════════════════════════════════════╗
║     微信小游戏备案自动化填写 v4                 ║
║  游戏: {GAME['name']:<38s}  ║
║  AppID: {GAME['appid']:<37s}  ║
╚══════════════════════════════════════════════════╝
""")

    async with async_playwright() as p:
        data_dir = DIR / ".browser-data"
        data_dir.mkdir(exist_ok=True)

        print("🌐 启动浏览器 (persistent context)...")
        ctx = await p.chromium.launch_persistent_context(
            str(data_dir),
            headless=False,
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            ignore_default_args=["--enable-automation"],
            slow_mo=100,
        )

        # 等一下让浏览器稳定
        await asyncio.sleep(3)

        # 使用已有页面或创建新的
        if ctx.pages:
            page = ctx.pages[0]
            print(f"  使用已有页面: {page.url[:60]}")
        else:
            page = await ctx.new_page()
            print(f"  创建新页面")

        try:
            # Phase 1: 检查登录状态
            print("\n📋 Phase 1: 登录")
            print("-" * 50)

            current = page.url
            print(f"  当前URL: {current[:80]}")

            need_login = True
            if any(k in current for k in ["home", "wxamp", "basicprofile"]) and "scanlogin" not in current:
                need_login = False
                print("  ✅ 已有登录会话")
            else:
                # 尝试导航到首页
                try:
                    await page.goto(MP, timeout=15000)
                    await asyncio.sleep(3)
                    current = page.url
                    print(f"  导航后URL: {current[:80]}")
                    if any(k in current for k in ["home", "wxamp"]) and "scanlogin" not in current:
                        need_login = False
                        print("  ✅ 已登录")
                except Exception as e:
                    print(f"  ⚠️ 导航异常: {e}")
                    await asyncio.sleep(2)
                    current = page.url
                    print(f"  当前URL: {current[:80]}")
                    if any(k in current for k in ["home", "wxamp"]):
                        need_login = False

            if need_login:
                print("  ⏳ 请在浏览器中扫码登录...")
                await ss(page, "login")

                for i in range(90):
                    await asyncio.sleep(2)
                    try:
                        c = page.url
                        if any(k in c for k in ["home", "wxamp"]) and "scanlogin" not in c:
                            break
                    except:
                        pass
                    if i % 15 == 14:
                        print(f"    等待 {(i+1)*2}s...")
                else:
                    print("  ❌ 登录超时")
                    await ctx.close()
                    return

            print("  ✅ 登录完成")
            await asyncio.sleep(1)
            await ss(page, "logged_in")

            # 获取token
            token = ""
            m = re.search(r'token=(\d+)', page.url)
            if m:
                token = m.group(1)
            print(f"  🔑 Token: {token}")

            # Phase 2: 导航
            print("\n📋 Phase 2: 备案页面")
            print("-" * 50)

            url = f"{MP}/wxamp/subApp/game/minigame/new-pre-approval-file?status=1&token={token}&lang=zh_CN"
            print(f"  🔗 {url[:90]}")

            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception as e:
                print(f"  ⚠️ 导航: {e}")

            await asyncio.sleep(5)
            print(f"  URL: {page.url[:100]}")
            await ss(page, "beian")

            # Phase 3: 分析
            print("\n📋 Phase 3: 分析")
            print("-" * 50)

            scan = await deep_scan(page)
            with open(SS_DIR / "scan.json", "w", encoding="utf-8") as f:
                json.dump(scan, f, ensure_ascii=False, indent=2)
            print(f"  💾 scan.json")

            for fi in scan["frames"]:
                els = fi.get("els", {})
                print(f"\n  Frame[{fi['idx']}] ({'主' if fi.get('main') else '子'}) total={fi.get('total',0)}")
                if els.get("labels"): print(f"    labels: {els['labels'][:10]}")
                if els.get("buttons"): print(f"    btns: {els['buttons'][:10]}")
                if els.get("radios"): print(f"    radios: {[r['lbl'] for r in els['radios'][:8]]}")
                if els.get("inputs"): print(f"    inputs: {[(i.get('ph','') or i.get('n','') or i['t']) for i in els['inputs'][:8]]}")

                # 备案相关文本
                texts = els.get("texts", [])
                related = [t for t in texts if any(k in t for k in ["备案","审批","主体","负责","提交","游戏","名称","服务","上传","选择","下一步","保存","不涉及"])]
                if related:
                    print(f"    📝 相关: {related[:10]}")

            # Phase 4: 自动填写
            print("\n📋 Phase 4: 自动填写")
            print("-" * 50)

            filled = 0
            for frame in page.frames:
                for lbl in ["游戏名称", "小程序名称", "小游戏名称"]:
                    if await try_fill(frame, lbl, GAME["name"]):
                        filled += 1; break
                for lbl in ["游戏简介", "简介", "描述"]:
                    if await try_fill(frame, lbl, GAME["description"], "textarea"):
                        filled += 1; break
                for t in ["不涉及", "无需前置审批"]:
                    if await try_click(frame, t):
                        filled += 1; break
                for t in ["休闲益智", "休闲"]:
                    if await try_click(frame, t):
                        filled += 1; break

            print(f"\n  自动填写: {filled} 个")
            await ss(page, "filled")

            # Phase 5: 设置页面
            print("\n📋 Phase 5: 设置页面")
            print("-" * 50)

            try:
                await page.goto(f"{MP}/wxamp/basicprofile/index?token={token}&lang=zh_CN",
                               wait_until="networkidle", timeout=15000)
                await asyncio.sleep(3)
                await ss(page, "settings")

                scan2 = await deep_scan(page)
                for fi in scan2["frames"]:
                    texts = fi.get("els", {}).get("texts", [])
                    related = [t for t in texts if "备案" in t]
                    if related:
                        print(f"  Frame[{fi['idx']}] 备案: {related[:5]}")
            except Exception as e:
                print(f"  ⚠️ {e}")

            # Phase 6: 保持打开
            print(f"""
{'='*50}
📌 备案指南（合成大西瓜 - 休闲益智游戏）

  1. 主体信息: 地区、主办者性质、证件
  2. 主体负责人: 姓名、身份证、手机号、邮箱
  3. 小程序信息:
     - 名称: 合成大西瓜
     - 服务内容: 游戏 → 休闲益智
     - 前置审批: 选择「不涉及」
  4. 小程序负责人: 信息 + 人脸核身
  5. 提交 → 初审(1-2天) → 短信核验 → 管局审核

  ⏳ 浏览器保持打开 (关闭浏览器或 Ctrl+C 退出)
{'='*50}
""")

            try:
                while True:
                    await asyncio.sleep(5)
                    try:
                        _ = page.url
                    except:
                        break
            except KeyboardInterrupt:
                print("\n  👋 退出")

        except Exception as e:
            print(f"\n❌ {e}")
            import traceback
            traceback.print_exc()
        finally:
            try:
                await ctx.close()
            except:
                pass

    print(f"\n✅ 截图: {SS_DIR}")


if __name__ == "__main__":
    asyncio.run(run())
