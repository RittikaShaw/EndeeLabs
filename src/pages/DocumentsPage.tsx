import { useState, useEffect } from 'react'
import {
  FileText,
  Trash2,
  Upload,
  Loader2,
  File,
  FileType2,
  Clock,
  HardDrive,
  Layers,
  CheckCircle2,
  AlertCircle,
  Timer,
  CircleDashed,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { cn, formatFileSize, formatDate } from '@/lib/utils'
import {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
} from '@rag/store'

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />
    case 'docx':
      return <FileType2 className="h-5 w-5 text-blue-500" />
    case 'txt':
      return <File className="h-5 w-5 text-gray-500" />
    default:
      return <FileText className="h-5 w-5 text-muted-foreground" />
  }
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'completed':
      return {
        badge: <Badge variant="success">Completed</Badge>,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        label: 'Processing complete',
      }
    case 'processing':
      return {
        badge: <Badge variant="warning">Processing</Badge>,
        icon: <Timer className="h-4 w-4 text-yellow-500 animate-spin" />,
        label: 'Being processed...',
      }
    case 'failed':
      return {
        badge: <Badge variant="destructive">Failed</Badge>,
        icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        label: 'Processing failed',
      }
    default:
      return {
        badge: <Badge variant="secondary">Pending</Badge>,
        icon: <CircleDashed className="h-4 w-4 text-muted-foreground" />,
        label: 'Waiting to process',
      }
  }
}

export function DocumentsPage() {
  const { toast } = useToast()
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)

  const { data: documents, isLoading, refetch } = useGetDocumentsQuery()
  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation()
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation()

  const selectedDoc = documents?.find((d) => d.id === selectedDocId) || null

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_FILE_TYPES,
    onDrop: async (acceptedFiles) => {
      for (const file of acceptedFiles) {
        try {
          const result = await uploadDocument({ file }).unwrap()
          toast({
            title: 'Document uploaded',
            description: `${file.name} has been uploaded and is being processed.`,
          })
          setSelectedDocId(result.id)
          refetch()
        } catch {
          toast({
            title: 'Upload failed',
            description: `Failed to upload ${file.name}. Please try again.`,
            variant: 'destructive',
          })
        }
      }
    },
  })

  const handleDelete = async () => {
    if (!documentToDelete) return
    try {
      await deleteDocument({ id: documentToDelete }).unwrap()
      toast({
        title: 'Document deleted',
        description: 'The document has been permanently deleted.',
      })
      if (selectedDocId === documentToDelete) {
        setSelectedDocId(null)
      }
      refetch()
    } catch {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the document. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const confirmDelete = (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDocumentToDelete(docId)
    setDeleteDialogOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-3.5rem)] gap-0">
        {/* Left Panel - Document List */}
        <div className="w-80 flex-shrink-0 border-r flex flex-col bg-muted/30">
          {/* Upload Button */}
          <div className="p-3">
            <div
              {...getRootProps()}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors text-sm',
                isDragActive
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-muted-foreground/25 hover:border-primary/50 text-muted-foreground',
                isUploading && 'pointer-events-none opacity-50'
              )}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : isDragActive ? (
                <>
                  <Upload className="h-4 w-4" />
                  Drop files here
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Document
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Document List */}
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              {documents?.length || 0} document{(documents?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 pb-2 space-y-0.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !documents?.length ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground/60">
                    No documents yet
                  </p>
                  <p className="text-xs text-muted-foreground/40 mt-1">
                    Upload a PDF, DOCX, or TXT file
                  </p>
                </div>
              ) : (
                documents.map((doc) => {
                  const status = getStatusInfo(doc.status)
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group',
                        selectedDocId === doc.id
                          ? 'bg-background shadow-sm border'
                          : 'hover:bg-background/60'
                      )}
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(doc.fileSize)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {status.icon}
                          </span>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => confirmDelete(doc.id, e)}
                            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Document Preview / Details */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedDoc ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                Select a document
              </h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Choose a document from the list to view its details, or upload a new one.
              </p>
            </div>
          ) : (
            <>
              {/* Document Header */}
              <div className="px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(selectedDoc.fileType)}
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold truncate">
                        {selectedDoc.name}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedDoc.fileName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusInfo(selectedDoc.status).badge}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => confirmDelete(selectedDoc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Document Details + Preview */}
              <div className="px-4 py-3 flex-1 overflow-auto">
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <DetailCard
                    icon={<HardDrive className="h-3.5 w-3.5" />}
                    label="Size"
                    value={formatFileSize(selectedDoc.fileSize)}
                  />
                  <DetailCard
                    icon={<FileType2 className="h-3.5 w-3.5" />}
                    label="Type"
                    value={selectedDoc.fileType.toUpperCase()}
                  />
                  <DetailCard
                    icon={<Layers className="h-3.5 w-3.5" />}
                    label="Chunks"
                    value={
                      selectedDoc.status === 'completed'
                        ? String(selectedDoc.chunkCount)
                        : '-'
                    }
                  />
                  <DetailCard
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="Uploaded"
                    value={formatDate(selectedDoc.uploadedAt)}
                  />
                </div>

                {/* Preview Area */}
                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                  {selectedDoc.fileType === 'pdf' ? (
                    <iframe
                      src={selectedDoc.fileUrl}
                      className="w-full h-[calc(100vh-14rem)]"
                      title={selectedDoc.name}
                    />
                  ) : selectedDoc.fileType === 'txt' ? (
                    <TxtPreview url={selectedDoc.fileUrl} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileType2 className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Preview not available for .{selectedDoc.fileType} files
                      </p>
                      <a
                        href={selectedDoc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2"
                      >
                        <Button variant="outline" size="sm">
                          Download File
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Document</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this document? This will remove
                the file and all associated chunks and embeddings. This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-xs font-semibold truncate">{value}</p>
    </div>
  )
}

function TxtPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        setContent(text)
        setLoading(false)
      })
      .catch(() => {
        setContent('Failed to load preview.')
        setLoading(false)
      })
  }, [url])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ScrollArea className="h-[500px]">
      <pre className="p-4 text-sm whitespace-pre-wrap font-mono text-foreground/80">
        {content}
      </pre>
    </ScrollArea>
  )
}
