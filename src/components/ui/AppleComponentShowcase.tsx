import React, { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from '@/components/ui'
import { SlidersHorizontal, Sparkles, MoreHorizontal, CheckCircle2 } from 'lucide-react'

export const AppleComponentShowcase: React.FC = () => {
  const [selectedValue, setSelectedValue] = useState('daily')
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <Card className="max-w-xl mx-auto my-6 border border-white/90 dark:border-white/10 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Apple 风格 shadcn/ui 组件库</CardTitle>
            <Badge variant="glass">Liquid Glass</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>快捷选项</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert('查看详情')}>
                <Sparkles className="mr-2 h-4 w-4 text-[#0071E3] dark:text-[#00E5FF]" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert('偏好设置')}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                偏好设置
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>
          完美兼容 Apple iOS 字体排版、磨砂毛玻璃与按压缩放微交互
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 按钮群组 */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="default">系统主按钮</Button>
          <Button variant="secondary">次级毛玻璃</Button>
          <Button variant="outline">轻巧边框</Button>
          <Button variant="destructive">危险操作</Button>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="default">主要</Badge>
          <Badge variant="secondary">中性</Badge>
          <Badge variant="success">已完成</Badge>
          <Badge variant="warning">进行中</Badge>
          <Badge variant="destructive">紧急</Badge>
        </div>

        {/* 下拉选择器与弹窗联动 */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-48">
            <Select value={selectedValue} onValueChange={setSelectedValue}>
              <SelectTrigger>
                <SelectValue placeholder="选择周期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">每日总结</SelectItem>
                <SelectItem value="weekly">周报计划</SelectItem>
                <SelectItem value="custom">自定义事项</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glass" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                打开确认弹窗
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认提交计划？</DialogTitle>
                <DialogDescription>
                  当前所选周期为「{selectedValue === 'daily' ? '每日总结' : selectedValue === 'weekly' ? '周报计划' : '自定义事项'}」，提交后将自动同步至工作台数据流中。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button variant="default" onClick={() => setDialogOpen(false)}>
                  确认完成
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
export default AppleComponentShowcase
