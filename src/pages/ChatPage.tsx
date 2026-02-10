import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Send,
  Plus,
  MessageSquare,
  Loader2,
  FileText,
  Bot,
  User,
  Sparkles,
  ArrowDown,
  PanelLeftClose,
  PanelLeft,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  useGetChatsQuery,
  useGetChatQuery,
  useCreateChatMutation,
  useSendMessageMutation,
  useDeleteChatMutation,
} from '@rag/store'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    documentId: string
    documentTitle: string
    chunkIndex: number
    content: string
    similarity: number
  }>
  createdAt: string
}

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateStr))
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
    </div>
  )
}

export function ChatPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { data: chats, refetch: refetchChats } = useGetChatsQuery()
  const { data: currentChat, isLoading: isLoadingChat } = useGetChatQuery(
    { id: sessionId! },
    { skip: !sessionId }
  )
  const [createChat] = useCreateChatMutation()
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation()
  const [deleteChat] = useDeleteChatMutation()

  const messages: Message[] = currentChat?.messages || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const viewport = target.querySelector('[data-radix-scroll-area-viewport]')
    if (!viewport) return
    const { scrollTop, scrollHeight, clientHeight } = viewport
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleNewChat = async () => {
    try {
      const result = await createChat({}).unwrap()
      refetchChats()
      navigate(`/chat/${result.id}`)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create a new chat session.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat({ id: chatId }).unwrap()
      refetchChats()
      if (sessionId === chatId) {
        navigate('/chat')
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete chat session.',
        variant: 'destructive',
      })
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return

    const message = input.trim()
    setInput('')

    try {
      await sendMessage({
        sessionId,
        content: message,
      }).unwrap()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      })
      setInput(message)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-3.5rem)] gap-0">
        {/* Sidebar */}
        <div
          className={cn(
            'flex-shrink-0 border-r bg-muted/30 flex flex-col transition-all duration-300 overflow-hidden',
            sidebarOpen ? 'w-72' : 'w-0 border-r-0'
          )}
        >
          <div className="w-72 flex flex-col h-full">
            <div className="p-3 flex gap-2">
              <Button
                onClick={handleNewChat}
                className="flex-1 justify-start gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                    className="flex-shrink-0"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Close sidebar</TooltipContent>
              </Tooltip>
            </div>

            <Separator />

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {!chats?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground/60">
                      No conversations yet
                    </p>
                  </div>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={cn(
                        'flex items-center rounded-lg transition-all group',
                        sessionId === chat.id
                          ? 'bg-background shadow-sm border'
                          : 'hover:bg-background/60'
                      )}
                    >
                      <button
                        onClick={() => navigate(`/chat/${chat.id}`)}
                        className="flex-1 flex items-center gap-3 px-3 py-2.5 text-sm text-left min-w-0"
                      >
                        <MessageSquare
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            sessionId === chat.id
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                        <span className="truncate flex-1">
                          {chat.title || 'New Chat'}
                        </span>
                      </button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteChat(chat.id)
                            }}
                            className="p-1.5 mr-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Delete chat</TooltipContent>
                      </Tooltip>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Sidebar toggle when collapsed */}
        {!sidebarOpen && (
          <div className="flex-shrink-0 p-2 border-r">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Open sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!sessionId ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Chat with your documents
              </h2>
              <p className="text-muted-foreground mt-3 max-w-sm leading-relaxed">
                Start a conversation and ask questions about your uploaded
                documents. AI will find relevant information using RAG.
              </p>
              <Button onClick={handleNewChat} className="mt-6 gap-2" size="lg">
                <Plus className="h-4 w-4" />
                Start New Chat
              </Button>
            </div>
          ) : isLoadingChat ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading conversation...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 relative">
                <ScrollArea
                  className="h-full"
                  ref={scrollAreaRef}
                  onScrollCapture={handleScroll}
                >
                  <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Bot className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                          Ask a question to get started
                        </p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                          I'll search your documents for relevant answers
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="flex gap-3 group">
                          {/* Avatar */}
                          <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                            <AvatarFallback
                              className={cn(
                                'text-xs font-medium',
                                message.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted-foreground/10 text-muted-foreground'
                              )}
                            >
                              {message.role === 'user' ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Bot className="h-4 w-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>

                          {/* Message Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {message.role === 'user' ? 'You' : 'Assistant'}
                              </span>
                              {message.createdAt && (
                                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  {formatTime(message.createdAt)}
                                </span>
                              )}
                            </div>

                            <div
                              className={cn(
                                'text-sm leading-relaxed whitespace-pre-wrap',
                                message.role === 'assistant' &&
                                  'text-foreground/90'
                              )}
                            >
                              {message.content}
                            </div>

                            {/* Sources */}
                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                  <FileText className="h-3 w-3" />
                                  {message.sources.length} source
                                  {message.sources.length > 1 ? 's' : ''} found
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {message.sources.map((source, idx) => (
                                    <Tooltip key={idx}>
                                      <TooltipTrigger asChild>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-muted/50 hover:bg-muted transition-colors cursor-default text-xs">
                                          <FileText className="h-3 w-3 text-primary" />
                                          <span className="font-medium truncate max-w-[150px]">
                                            {source.documentTitle}
                                          </span>
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] px-1.5 py-0 h-4"
                                          >
                                            #{source.chunkIndex + 1}
                                          </Badge>
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] px-1.5 py-0 h-4"
                                          >
                                            {(source.similarity * 100).toFixed(0)}%
                                          </Badge>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="bottom"
                                        className="max-w-sm"
                                      >
                                        <p className="text-xs leading-relaxed">
                                          {source.content}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Typing Indicator */}
                    {isSending && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                          <AvatarFallback className="bg-muted-foreground/10 text-muted-foreground text-xs">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <span className="text-sm font-semibold">
                            Assistant
                          </span>
                          <div className="bg-muted rounded-lg px-4 py-3 inline-block">
                            <TypingIndicator />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Scroll to bottom button */}
                {showScrollDown && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute bottom-4 right-4 h-8 w-8 rounded-full shadow-md bg-background"
                    onClick={scrollToBottom}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Separator />

              {/* Input Area */}
              <div className="p-4 bg-background">
                <div className="max-w-3xl mx-auto">
                  <div className="relative flex items-end gap-2 rounded-xl border bg-muted/30 p-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question about your documents..."
                      className="min-h-[44px] max-h-[160px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-3 px-2"
                      disabled={isSending}
                      rows={1}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleSend}
                          disabled={!input.trim() || isSending}
                          size="icon"
                          className="h-9 w-9 flex-shrink-0 rounded-lg"
                        >
                          {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send message (Enter)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-muted-foreground/50 text-center mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
