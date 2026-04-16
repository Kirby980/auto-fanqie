package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

type Result struct {
	Ok      bool                   `json:"ok"`
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Any     map[string]interface{} `json:"-"`
}

func runFanqieSkill(cwd string, args ...string) (int, map[string]interface{}, string) {
	all := append([]string{"bin/fanqie-skill.js"}, args...)
	cmd := exec.Command("node", all...)
	cmd.Dir = cwd
	var out bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errBuf
	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			exitCode = ee.ExitCode()
		} else {
			exitCode = 1
		}
	}
	stdout := out.String()
	lines := bytes.Split([]byte(stdout), []byte("\n"))
	var last []byte
	for i := len(lines) - 1; i >= 0; i-- {
		if len(bytes.TrimSpace(lines[i])) > 0 {
			last = lines[i]
			break
		}
	}
	payload := map[string]interface{}{}
	if len(last) > 0 {
		_ = json.Unmarshal(last, &payload)
	}
	return exitCode, payload, errBuf.String()
}

func main() {
	cwd, _ := os.Getwd()
	project := filepath.Join(cwd, "fanqie-skill")

	code, payload, stderr := runFanqieSkill(project, "validate", "--content-file", "chapter.txt", "--minHan", "3000")
	if code != 0 {
		fmt.Println(code)
		fmt.Println(payload)
		if stderr != "" {
			fmt.Print(stderr)
		}
		os.Exit(code)
	}

	code, payload, stderr = runFanqieSkill(project, "publish", "--book", "你的书名", "--title", "第001章 标题", "--content-file", "chapter.txt", "--mode", "draft")
	fmt.Println(code)
	fmt.Println(payload)
	if stderr != "" {
		fmt.Print(stderr)
	}
	os.Exit(code)
}
