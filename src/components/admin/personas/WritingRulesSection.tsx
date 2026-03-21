"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function WritingRulesSection() {
  return (
    <div className="space-y-4 pt-6 border-t">
      <div>
        <h2 className="text-lg font-semibold">系統規則</h2>
        <p className="text-xs text-muted-foreground mt-1">
          系統規則，如需修改請聯繫開發團隊
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: 寫手撰寫規則 */}
        <Card className="bg-muted/30 border-muted">
          <CardHeader>
            <CardTitle className="text-base">寫手撰寫規則</CardTitle>
            <CardDescription>AI 寫手產文時遵循的規範</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">策略 1：多源綜合報導</p>
              <p>來自不同新聞網站的相似新聞超過一篇以上時，綜合重寫</p>
            </div>
            <div>
              <p className="font-medium text-foreground">策略 2：內容增值搜尋</p>
              <p>確定要寫的文章才上網搜尋，豐富內容</p>
            </div>
            <div>
              <p className="font-medium text-foreground">策略 3：熱門素材綜合報導</p>
              <p>超過 12 小時無重複素材時，挑選熱門新聞綜合撰寫</p>
            </div>
            <div className="pt-2 border-t border-muted">
              <p className="font-medium text-foreground">來源標註</p>
              <p>所有引用必須標註來源（raw_article / web_search / social）</p>
            </div>
            <div>
              <p className="font-medium text-foreground">基本要求</p>
              <p>600-1200 字、完整結構、繁體中文、球員名保留英文</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: 總編輯審查規則 */}
        <Card className="bg-muted/30 border-muted">
          <CardHeader>
            <CardTitle className="text-base">總編輯審查規則</CardTitle>
            <CardDescription>AI 總編輯審稿時的標準</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">9 項審查標準</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>標題品質</li>
                <li>內容品質</li>
                <li>事實查核</li>
                <li>品牌調性</li>
                <li>SEO 優化</li>
                <li>整體品質</li>
                <li>題材未重複（pass/fail）</li>
                <li>圖片未重複（pass/fail）</li>
                <li>有圖片（pass/fail）</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-muted">
              <p className="font-medium text-foreground">通過條件</p>
              <p>評分項平均 &ge; 6 分且無任何項 &lt; 4 分，pass/fail 項全部 pass</p>
            </div>
            <div>
              <p className="font-medium text-foreground">二級制</p>
              <p>通過 &rarr; approved &rarr; 發布；不通過 &rarr; rejected &rarr; 不發布</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: 產文邏輯流程 */}
        <Card className="bg-muted/30 border-muted">
          <CardHeader>
            <CardTitle className="text-base">產文邏輯流程</CardTitle>
            <CardDescription>從爬蟲到發布的完整流程</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">1</span>
                <span>爬蟲收集原始新聞</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">2</span>
                <span>規劃（AI）— 決定寫哪些文章</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">3</span>
                <span>寫手（AI）— 撰寫文章</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">4</span>
                <span>總編輯（AI）— 審查品質</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">5</span>
                <span>發布至網站與頻道</span>
              </div>
            </div>
            <div className="pt-2 border-t border-muted">
              <p className="font-medium text-foreground">Prompt 優先級</p>
              <p>後台 persona 設定 &gt; Writer Skill 預設規則</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
