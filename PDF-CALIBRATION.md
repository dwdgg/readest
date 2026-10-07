# Readest PDF 页码校准版

这是基于 [Readest](https://github.com/readest/readest) 0.12.12 的非官方修改版。
保留原项目版权声明与 AGPL-3.0-or-later 许可证，详见 LICENSE。

## 下载与使用

在本仓库 [Releases](https://github.com/dwdgg/readest/releases) 中下载 Windows x64 的 `setup.exe`。
GitHub 自动提供的 Source code.zip 是源码，不是安装包。

修改版安装名称为 Readest PDF Calibration，与原版使用不同应用标识，默认书库独立。
导入 PDF，跳到正文第一页，打开“设置 → 布局”，选择“页码”或“参考页码”显示，
在“页码校准”中输入 1 并应用。例如文件第 3 页对应正文第 1 页时，封面显示 -1，目录显示 0。
页脚支持负数与零跳页；校准按书保存在本机，重启后保留，也可以重置。

PDF 文件、物理阅读进度与书签定位保持原样。目录、缩略图、批注的页码暂不校准，偏移不跨设备同步。
测试版关闭自动更新，Windows 安装包未签名。桌面安装后的功能仍需实际验证。

## 在 GitHub 打包

打开 Actions，选择 **Build PDF Calibration Windows → Run workflow → main → Run workflow**。
工作流检查类型、运行页码校准测试，然后生成 Windows x64 安装程序并发布到 Releases。
无需原作者的私有服务密钥或更新签名密钥；使用 GitHub 自动提供的 GITHUB_TOKEN 发布。

`apps/readest-app/scripts/prepare-pdf-calibration-build.mjs` 在临时构建 checkout 中设定应用标识、
版本、安装名称，移除会与原版冲突的缩略图注册和文件关联，并清空官方更新地址。
工作流通过已有的 NEXT_PUBLIC_DISABLE_UPDATER 开关关闭更新界面。
原始 Tauri 配置保留在源码中，打包前由该脚本确定修改版配置。

后续发布需要修改脚本中的版本；请从包含修改的提交运行工作流，确保标签与源码对应。
