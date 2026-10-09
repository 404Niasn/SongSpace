# 金卡评论摘录

用户要求使用真实歌曲评论，替换此前原创文案，并进一步要求不要标注、不要故事类。本轮九张金卡已全部替换为 QQ 音乐对应歌曲“热门评论”中的连续短摘录，选择能独立表达感受或想法的段落，保留原文标点及措辞，不补写、不拼接句子。页面仅展示文字，不显示来源、作者、点赞或摘录标签。

来源通过 QQ 音乐公开评论接口读取：`https://c.y.qq.com/base/fcgi-bin/fcg_global_comment_h5.fcg`，使用卡库原版歌曲数字 ID，`biztype=1&cmd=8&pagenum=0&pagesize=20&format=json`，取 `hot_comment.commentlist`。每条摘录在写入前校验是原评论的连续子串。没有使用二次转载的所谓热评合集。

摘录、作者、评论 ID、点赞快照、歌曲页和接口 URL 保存于 `songspace-web/public/catalog/song-comment-excerpts.json`，应用数据位于 `songspace-web/src/game/commentQuotes.ts`。点赞数为 2026-10-08 获取时的快照，不代表实时排名；作者昵称原样保留，不额外采集头像或账号身份信息。

卡片及详情仅展示文字，来源元数据只保留在项目资料中以便核对。普通装饰文案仍是此前原创内容，本次替换范围为九张金卡。

本文件覆盖此前方案及 README 中关于“金卡原创文案”的描述。生产构建及意象回归检查通过；未启动模拟器或真机。
