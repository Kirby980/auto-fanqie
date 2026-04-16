package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

type ValidateResult struct {
	Ok       bool   `json:"ok"`
	Code     string `json:"code"`
	Message  string `json:"message"`
	HanCount int    `json:"hanCount"`
	MinHan   int    `json:"minHan"`
}

func main() {
	bookName := "《我的修仙日常》"
	chapterTitle := "第001章 灵气复苏"
	contentFile := "../examples/chapter.txt"
	minHan := 3

	// 1. 调用 Node.js 校验字数
	fmt.Println("🔍 步骤 1/2: 校验字数...")
	valCmd := exec.Command("node", "../validate.js", "--content-file", contentFile, "--minHan", strconv.Itoa(minHan))
	valOut, err := valCmd.CombinedOutput()

	if err != nil {
		lines := strings.Split(strings.TrimSpace(string(valOut)), "\n")
		lastLine := lines[len(lines)-1]

		var result ValidateResult
		if unmarshalErr := json.Unmarshal([]byte(lastLine), &result); unmarshalErr == nil {
			fmt.Printf("\n❌ [校验失败] %s\n", result.Message)
		} else {
			fmt.Printf("\n❌ [校验失败] %s\n", string(valOut))
		}
		fmt.Println("\n💡 AI 提示：请根据上述错误信息重写正文内容，使其满足字数要求。")
		os.Exit(2)
	}

	fmt.Println("✅ 校验通过，准备发布...")

	// 2. 使用 playwright-cli 自动操作发布
	fmt.Println("🚀 步骤 2/2: 调用 playwright-cli 前台可视化发布...")
	cli := "npx" // 如果全局安装了 playwright-cli，可以直接用 "playwright-cli"
	cliArg := "playwright-cli"

	commands := [][]string{
		{cli, cliArg, "open", "https://writer.fanqienovel.com/", "--headed", "--persistent"},
		{cli, cliArg, "click", fmt.Sprintf("text=%s", bookName)},
		{cli, cliArg, "click", "text=新建章节"},
		{cli, cliArg, "fill", "input[placeholder*='章节名称']", chapterTitle},
		{cli, cliArg, "eval", fmt.Sprintf("el => el.value = require('fs').readFileSync('%s', 'utf8')", contentFile), "textarea[placeholder*='正文']"},
		{cli, cliArg, "click", "text=存草稿"},
		{cli, cliArg, "wait", "2000"},
		{cli, cliArg, "close"},
	}

	for _, cmdArgs := range commands {
		fmt.Printf("▶️  执行: %s\n", strings.Join(cmdArgs, " "))
		cmd := exec.Command(cmdArgs[0], cmdArgs[1:]...)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		
		if err := cmd.Run(); err != nil {
			fmt.Printf("❌ 命令执行失败: %v\n", err)
			// 出错时尝试关闭残留的浏览器实例
			cleanupCmd := exec.Command(cli, cliArg, "close")
			cleanupCmd.Run()
			os.Exit(1)
		}
	}

	fmt.Println("\n🎉 全部自动化命令执行完毕！章节已成功保存。")
}