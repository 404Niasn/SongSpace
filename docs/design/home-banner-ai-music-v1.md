# 首页音乐创作 banner

仅改首页 GameHall 的探索 banner。标题为两行真实 DOM 文本：Build with AI / Build with Music，不追加说明文案。沿用项目薄荷绿，Space Grotesk 可变字体本地托管，字体授权文件在 public/fonts。

两行采用轻重不同字重、缩小的 with 和第二行水平错位。桌面背景右侧呈现唱片上的微缩海岸世界，左侧保持高对比留白；小屏保留两行标题与探索入口。按钮入口保持原探索事件。

动效：文字和入口分别延迟入场，背景 16 秒轻微推近往复，按钮箭头悬停斜移。按用户后续要求移除首页光谱开关，动效默认开启；prefers-reduced-motion 时停止。

背景使用内置 image_gen 生成。生成提示：宽幅 2.4:1；唱片及轻盈音乐带中生长出微缩海岸、树木与小建筑；薄荷绿、奶油白、暖桃色；哑光陶瓷与透明树脂质感；主体在右侧 45%，左侧 55% 留白；自然工作室光线；无文字、标志、机器人、电路或霓虹。

第一版偏暖。按用户要求用内置 image_gen 编辑成冷白、白瓷、淡薄荷和银色：保留构图、去除黄色和金色，左侧近白留白。页面背景同步改为白色。

源图：songspace-web/public/illustrations/music-world-banner-white-v2.png。
页面使用 WebP：songspace-web/public/illustrations/music-world-banner-white-v2.webp。
只读预览：songspace-web/tests/home-banner-preview.html。

签到区：每日卡包实物预览、七日进度（已签/今天/奖励日）、第 5/7 天加赠与领取入口。原七日循环和断签逻辑不变，daily-rewards.mjs 验证。
