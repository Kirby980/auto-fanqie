package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/playwright-community/playwright-go"
)

func main() {
	var novelName, targetVolumeName, chapterTitle, contentFile string

	flag.StringVar(&novelName, "novel", "重生1982：我有一片禁忌海", "Name of the novel")
	flag.StringVar(&targetVolumeName, "volume", "第四卷：新的开始", "Name of the volume")
	flag.StringVar(&chapterTitle, "title", "", "Chapter title")
	flag.StringVar(&contentFile, "file", "", "File to read content from")
	flag.Parse()

	fmt.Printf("🚀 启动浏览器...\n    书名: %s\n    卷名: %s\n    标题: %s\n    内容文件: %s\n\n",
		novelName, targetVolumeName, chapterTitle, contentFile)

	err := playwright.Install()
	if err != nil {
		log.Printf("提示: %v (可能已安装)", err)
	}

	pw, err := playwright.Run()
	if err != nil {
		log.Fatalf("❌ 无法启动 Playwright: %v", err)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatalf("❌ 无法获取用户主目录: %v", err)
	}
	userDataDir := filepath.Join(homeDir, ".playwright", "fanqie-profile")

	// 启动本地 Chrome（防检测）
	context, err := pw.Chromium.LaunchPersistentContext(userDataDir, playwright.BrowserTypeLaunchPersistentContextOptions{
		Headless: playwright.Bool(false),
		Channel:  playwright.String("chrome"),
		Viewport: &playwright.Size{Width: 1280, Height: 720},
		Args: []string{
			"--disable-blink-features=AutomationControlled",
			"--disable-infobars",
		},
	})
	if err != nil {
		log.Fatalf("❌ 无法启动持久化浏览器上下文: %v", err)
	}
	defer context.Close()

	var page playwright.Page
	if len(context.Pages()) > 0 {
		page = context.Pages()[0]
	} else {
		page, err = context.NewPage()
		if err != nil {
			log.Fatalf("❌ 无法创建新页面: %v", err)
		}
	}

	// 注入反爬脚本
	err = page.AddInitScript(playwright.Script{
		Content: playwright.String("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"),
	})
	if err != nil {
		log.Printf("⚠️ 注入反爬脚本失败: %v", err)
	}

	fmt.Println("🌐 访问番茄小说作家后台...")
	_, err = page.Goto("https://fanqienovel.com/main/writer/book-manage", playwright.PageGotoOptions{
		Timeout: playwright.Float(60000),
	})
	if err != nil {
		log.Fatalf("❌ 无法访问作家后台: %v", err)
	}

	fmt.Println("⏳ 等待页面加载（如果需要登录，请在此期间完成登录）...")
	_, err = page.WaitForSelector("text=我的小说", playwright.PageWaitForSelectorOptions{
		Timeout: playwright.Float(60000),
	})
	if err != nil {
		log.Fatalf("❌ 登录超时或页面未正确加载: %v", err)
	}

	fmt.Printf("📖 查找小说: %s 并点击章节管理...\n", novelName)
	novelCard := page.Locator("div").Filter(playwright.LocatorFilterOptions{HasText: novelName}).Last()
	chapterManageBtn := novelCard.GetByText("章节管理").First()
	if err := chapterManageBtn.Click(); err != nil {
		log.Fatalf("❌ 点击章节管理失败: %v", err)
	}

	fmt.Println("👉 正在进入章节管理页面...")
	_, err = page.WaitForSelector("text=新建章节", playwright.PageWaitForSelectorOptions{
		Timeout: playwright.Float(30000),
	})
	if err != nil {
		log.Fatalf("❌ 章节管理页面加载超时: %v", err)
	}

	fmt.Printf("🔍 检查当前分卷是否为: %s\n", targetVolumeName)
	volumeDropdown := page.Locator(".arco-select").First()
	if err := volumeDropdown.Click(); err != nil {
		log.Fatalf("❌ 点击分卷下拉框失败: %v", err)
	}
	time.Sleep(1 * time.Second)

	volumeOption := page.Locator(".arco-select-option").Filter(playwright.LocatorFilterOptions{HasText: targetVolumeName})
	volumeExists, _ := volumeOption.IsVisible()

	if volumeExists {
		fmt.Printf("✅ 找到分卷: %s，直接选择\n", targetVolumeName)
		if err := volumeOption.Click(); err != nil {
			log.Fatalf("❌ 选择分卷失败: %v", err)
		}
	} else {
		fmt.Printf("⚠️ 未找到分卷: %s，准备新建分卷...\n", targetVolumeName)
		// 关闭下拉框
		page.Mouse().Click(0, 0)
		time.Sleep(500 * time.Millisecond)

		fmt.Println("👉 点击“编辑分卷”按钮...")
		if err := page.Locator("button").Filter(playwright.LocatorFilterOptions{HasText: "编辑分卷"}).Click(); err != nil {
			log.Fatalf("❌ 点击编辑分卷失败: %v", err)
		}

		_, err = page.WaitForSelector(`div.arco-modal:has-text("分卷")`, playwright.PageWaitForSelectorOptions{
			Timeout: playwright.Float(10000),
		})
		if err != nil {
			log.Fatalf("❌ 等待分卷弹窗超时: %v", err)
		}

		fmt.Println("👉 在分卷弹窗中点击“+ 新建分卷”...")
		if err := page.Locator(".arco-modal").GetByText("新建分卷").Click(); err != nil {
			log.Fatalf("❌ 点击新建分卷失败: %v", err)
		}

		fmt.Printf("👉 输入新分卷名称: %s\n", targetVolumeName)
		newVolumeInput := page.Locator(`.arco-modal input[value=""]`).First()
		if err := newVolumeInput.Fill(targetVolumeName); err != nil {
			log.Fatalf("❌ 填写新分卷名称失败: %v", err)
		}

		fmt.Println("👉 点击弹窗“确定”按钮保存...")
		if err := page.Locator(".arco-modal button").Filter(playwright.LocatorFilterOptions{HasText: "确定"}).Click(); err != nil {
			log.Fatalf("❌ 保存分卷失败: %v", err)
		}

		time.Sleep(2 * time.Second)

		// 再次打开选择
		if err := volumeDropdown.Click(); err != nil {
			log.Fatalf("❌ 再次点击分卷下拉框失败: %v", err)
		}
		time.Sleep(1 * time.Second)
		if err := page.Locator(".arco-select-option").Filter(playwright.LocatorFilterOptions{HasText: targetVolumeName}).Click(); err != nil {
			log.Fatalf("❌ 再次选择分卷失败: %v", err)
		}
		fmt.Printf("✅ 成功选择新建的分卷: %s\n", targetVolumeName)
	}

	chapterListUrl := page.URL()
	fmt.Printf("👉 记录章节管理页面URL以便后续返回验证: %s\n", chapterListUrl)

	fmt.Println("👉 确认分卷无误，点击“新建章节”按钮...")
	newChapterBtn := page.Locator("button").Filter(playwright.LocatorFilterOptions{HasText: "新建章节"}).First()
	if err := newChapterBtn.Click(); err != nil {
		log.Fatalf("❌ 点击新建章节按钮失败: %v", err)
	}

	fmt.Println("👉 正在进入新建章节编辑器页面...")
	_, err = page.WaitForSelector("text=请输入标题", playwright.PageWaitForSelectorOptions{
		Timeout: playwright.Float(30000),
	})
	if err != nil {
		log.Fatalf("❌ 等待章节编辑器超时: %v", err)
	}
	fmt.Println("✅ 成功进入第三个页面（章节编辑页）！")

	if chapterTitle != "" {
		fmt.Printf("👉 填写章节标题: %s\n", chapterTitle)
		titleLocator := page.GetByPlaceholder("请输入标题").First()
		if err := titleLocator.Fill(chapterTitle); err != nil {
			log.Printf("⚠️ 填写章节标题常规方法失败，尝试注入: %v\n", err)
			page.Evaluate(`(t) => {
				const el = document.querySelector('input[placeholder*="请输入标题"], .editor-title-input, .title-input');
				if (el) {
					el.value = t;
					el.dispatchEvent(new Event('input', { bubbles: true }));
					el.dispatchEvent(new Event('change', { bubbles: true }));
					el.blur();
				}
			}`, chapterTitle)
		}
	}

	if contentFile != "" {
		contentBytes, err := os.ReadFile(contentFile)
		if err == nil {
			fmt.Printf("👉 从文件读取并填写正文: %s\n", contentFile)
			
			// Format text into paragraphs, skipping title lines
			lines := strings.Split(string(contentBytes), "\n")
			var htmlBuilder strings.Builder
			for _, line := range lines {
				p := strings.TrimSpace(line)
				if p == "" {
					continue
				}
				if strings.HasPrefix(p, "### 第") || (strings.HasPrefix(p, "第") && strings.Contains(p, "章")) {
					continue
				}
				htmlBuilder.WriteString("<p>")
				htmlBuilder.WriteString(p)
				htmlBuilder.WriteString("</p>")
			}
			htmlContent := htmlBuilder.String()

			_, err = page.Evaluate(`(html) => {
				const el = document.querySelector('.ProseMirror, .ql-editor, [contenteditable="true"]:not(h1)');
				if (el) {
					el.innerHTML = html;
					el.dispatchEvent(new Event('input', { bubbles: true }));
					el.dispatchEvent(new Event('change', { bubbles: true }));
					el.blur();
				}
			}`, htmlContent)
			if err != nil {
				log.Fatalf("❌ 注入正文失败: %v", err)
			}
		} else {
			log.Printf("⚠️ 读取文件失败: %v\n", err)
		}
	}

	fmt.Println("👉 点击右上角的发布/下一步按钮...")
	publishBtn := page.Locator(`button:has-text("发布"), button:has-text("下一步")`).First()
	if err := publishBtn.Click(); err != nil {
		log.Fatalf("❌ 点击发布按钮失败: %v", err)
	}

	// 1. 错别字提示弹窗
	fmt.Println("🔍 检测是否出现【错别字】提示弹窗...")
	typoModal := page.Locator(`.arco-modal:has-text("检测到你还有错别字未修改")`)
	err = typoModal.WaitFor(playwright.LocatorWaitForOptions{
		State:   playwright.WaitForSelectorStateVisible,
		Timeout: playwright.Float(3000),
	})
	if err == nil {
		fmt.Println("⚠️ 出现错别字提示，点击【提交】继续...")
		typoModal.Locator("button").Filter(playwright.LocatorFilterOptions{HasText: "提交"}).Click()
	} else {
		fmt.Println("✅ 无错别字提示，继续下一步...")
	}

	// 2. 内容风险检测弹窗
	fmt.Println("🔍 检测是否出现【内容风险检测】弹窗...")
	riskModal := page.Locator(`.arco-modal:has-text("是否进行内容风险检测")`)
	err = riskModal.WaitFor(playwright.LocatorWaitForOptions{
		State:   playwright.WaitForSelectorStateVisible,
		Timeout: playwright.Float(5000),
	})
	if err == nil {
		fmt.Println("⚠️ 出现风险检测提示，点击【确定】...")
		riskModal.Locator("button").Filter(playwright.LocatorFilterOptions{HasText: "确定"}).Click()

		fmt.Println("⏳ 等待风险检测完成...")
		_, err = page.WaitForSelector("text=检测暂无风险", playwright.PageWaitForSelectorOptions{
			Timeout: playwright.Float(15000),
		})
		if err == nil {
			fmt.Println("✅ 风险检测完成且无风险！")
			fmt.Println("👉 再次点击右上角的发布/下一步按钮...")
			publishBtn.Click()
		} else {
			log.Printf("⚠️ 等待风险检测结果超时: %v\n", err)
		}
	} else {
		fmt.Println("⚠️ 未捕获到风险检测弹窗，可能已跳过或由于其他原因未显示...")
	}

	// 3. 最终发布设置弹窗
	fmt.Println("🔍 等待【发布设置】最终弹窗出现...")
	publishSettingModal := page.Locator(`.arco-modal:has-text("发布设置")`)
	err = publishSettingModal.WaitFor(playwright.LocatorWaitForOptions{
		State:   playwright.WaitForSelectorStateVisible,
		Timeout: playwright.Float(5000),
	})
	if err == nil {
		fmt.Println("👉 在发布设置中，选择【否】不使用AI...")
		noAiRadio := publishSettingModal.Locator(`.arco-radio:has-text("否")`)
		if err := noAiRadio.Click(); err != nil {
			log.Printf("❌ 点击【否】选项失败: %v\n", err)
		} else {
			fmt.Println("🚀 点击【确认发布】按钮！")
			if err := publishSettingModal.Locator("button").Filter(playwright.LocatorFilterOptions{HasText: "确认发布"}).Click(); err != nil {
				log.Printf("❌ 点击【确认发布】失败: %v\n", err)
			} else {
				// 4. 返回列表验证发布结果
				fmt.Println("⏳ 等待发布请求处理 (3秒)...")
				time.Sleep(3 * time.Second)

				fmt.Println("👉 正在返回章节管理页面进行最终验证...")
				if _, err := page.Goto(chapterListUrl, playwright.PageGotoOptions{
					WaitUntil: playwright.WaitUntilStateNetworkidle,
				}); err != nil {
					log.Printf("⚠️ 返回章节列表页面失败: %v\n", err)
				} else {
					fmt.Println("🔍 检查最新章节状态...")
					if _, err := page.WaitForSelector("tbody tr", playwright.PageWaitForSelectorOptions{
						Timeout: playwright.Float(10000),
					}); err == nil {
						firstRow := page.Locator("tbody tr").First()
						rowText, _ := firstRow.InnerText()
						
						// 将换行符替换为空格，方便单行打印
						words := strings.Fields(rowText)
						oneLineText := strings.Join(words, " ")
						
						hasStatus := strings.Contains(oneLineText, "待审核") || strings.Contains(oneLineText, "审核中") || strings.Contains(oneLineText, "已发布")
						
						// 为了应对番茄后台可能的标题截断（如"第76章 因果的..."），我们取标题的前10个字符进行模糊匹配验证
						// Go 中处理中文字符串截取需要转为 rune 切片
						titleRunes := []rune(chapterTitle)
						matchLen := 10
						if len(titleRunes) < matchLen {
							matchLen = len(titleRunes)
						}
						titleToMatch := string(titleRunes[:matchLen])
						hasCorrectTitle := true
						if titleToMatch != "" {
							hasCorrectTitle = strings.Contains(oneLineText, titleToMatch)
						}

						if hasStatus {
							fmt.Println("✅ 最终验证通过！最新章节状态正常。")
							fmt.Printf("📄 抓取到的最新章节信息: [ %s ]\n", oneLineText)
							if titleToMatch != "" && !hasCorrectTitle {
								fmt.Printf("⚠️ 提示：最新章节列表中似乎没有匹配到刚刚发布的标题前缀 \"%s\"，请手动确认。\n", titleToMatch)
							}
							fmt.Println("🎉 真正的发布成功！流程彻底执行完毕！")
						} else {
							fmt.Println("⚠️ 警告：最新章节的状态未显示为\"待审核\"或\"审核中\"。请手动确认！")
							fmt.Printf("📄 当前列表第一行内容: [ %s ]\n", oneLineText)
						}
					} else {
						fmt.Println("⚠️ 警告：无法加载章节列表，请手动验证发布结果。")
					}
				}
			}
		}
	} else {
		log.Printf("❌ 最终发布设置弹窗处理或验证失败: %v\n", err)
	}

	fmt.Println("🛑 脚本执行完毕。浏览器将在 10 秒后关闭...")
	time.Sleep(10 * time.Second)
}
