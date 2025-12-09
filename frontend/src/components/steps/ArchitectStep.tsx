'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Paperclip, FileText, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { generateSchema } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedFile {
    name: string;
    base64: string;
    type: string;
    preview?: string;
}

// PDF.js will be loaded dynamically
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

/**
 * Load PDF.js dynamically (client-side only)
 */
async function loadPdfJs() {
    if (pdfjsLib) return pdfjsLib;
    if (typeof window === 'undefined') return null;

    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    pdfjsLib = pdfjs;
    return pdfjs;
}

/**
 * Convert PDF to images using pdf.js in browser
 */
async function convertPdfToImages(file: File): Promise<string[]> {
    const pdfjs = await loadPdfJs();
    if (!pdfjs) throw new Error('PDF.js not available');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2; // Higher scale for better quality
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport,
        } as Parameters<typeof page.render>[0]).promise;

        // Convert canvas to base64 PNG
        const imageData = canvas.toDataURL('image/png');
        images.push(imageData);
    }

    return images;
}

export function ArchitectStep() {
    const {
        language,
        paperContent,
        setPaperContent,
        setGeneratedSchema,
        setCurrentStep,
        logicConfig,
    } = useWorkflowStore();
    const t = useTranslation(language);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [processedImages, setProcessedImages] = useState<string[]>([]);
    const [pdfJsReady, setPdfJsReady] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preload PDF.js on mount (client-side only)
    useEffect(() => {
        loadPdfJs().then(() => setPdfJsReady(true)).catch(console.error);
    }, []);

    const handleGenerate = async () => {
        if (!logicConfig.apiKey) {
            toast.error(t('missingApiKey'));
            return;
        }

        if (!paperContent.trim() && processedImages.length === 0) {
            toast.error(language === 'zh' ? '请输入文本或上传文件' : 'Please enter text or upload files');
            return;
        }

        setIsGenerating(true);
        try {
            const contentToSend = paperContent.trim() ||
                (language === 'zh'
                    ? '请分析上传的文档并生成视觉架构。'
                    : 'Please analyze the uploaded document(s) and generate a Visual Schema.');

            const response = await generateSchema(
                contentToSend,
                logicConfig,
                processedImages.length > 0 ? processedImages : undefined
            );
            setGeneratedSchema(response.schema);
            setCurrentStep(2);
            toast.success(language === 'zh' ? '蓝图生成成功！' : 'Blueprint generated successfully!');
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`${t('generationFailed')}: ${errorMessage}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = useCallback(async (files: FileList | null) => {
        if (!files) return;

        setIsProcessingFiles(true);
        const newFiles: UploadedFile[] = [];
        const newImages: string[] = [];

        try {
            for (const file of Array.from(files)) {
                if (file.type === 'application/pdf') {
                    // Convert PDF to images
                    toast.info(language === 'zh' ? `正在处理 PDF: ${file.name}...` : `Processing PDF: ${file.name}...`);
                    const pdfImages = await convertPdfToImages(file);

                    newFiles.push({
                        name: file.name,
                        base64: '',
                        type: file.type,
                        preview: pdfImages[0],
                    });

                    newImages.push(...pdfImages);
                    toast.success(language === 'zh'
                        ? `PDF 已转换为 ${pdfImages.length} 张图片`
                        : `PDF converted to ${pdfImages.length} images`);
                } else if (file.type.startsWith('image/')) {
                    // Read image directly
                    const reader = new FileReader();
                    const imageData = await new Promise<string>((resolve) => {
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsDataURL(file);
                    });

                    newFiles.push({
                        name: file.name,
                        base64: imageData,
                        type: file.type,
                        preview: imageData,
                    });

                    newImages.push(imageData);
                }
            }

            setUploadedFiles(prev => [...prev, ...newFiles]);
            setProcessedImages(prev => [...prev, ...newImages]);
        } catch (error) {
            console.error('Error processing files:', error);
            toast.error(language === 'zh' ? '文件处理失败' : 'Failed to process files');
        } finally {
            setIsProcessingFiles(false);
        }
    }, [language]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        handleFileUpload(e.dataTransfer.files);
    }, [handleFileUpload]);

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
        // For simplicity, clear all processed images when any file is removed
        const remainingFiles = uploadedFiles.filter((_, i) => i !== index);
        if (remainingFiles.length === 0) {
            setProcessedImages([]);
        }
    };

    const clearAllFiles = () => {
        setUploadedFiles([]);
        setProcessedImages([]);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="max-w-4xl mx-auto"
        >
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {t('step1Title')}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {t('step1Desc')}
                    </p>
                </div>

                {/* Unified Input Area */}
                <div
                    className="relative"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                >
                    {/* Text Input */}
                    <Textarea
                        value={paperContent}
                        onChange={(e) => setPaperContent(e.target.value)}
                        placeholder={t('paperPlaceholder')}
                        className="min-h-[300px] resize-none border-slate-200 focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm pb-16"
                    />

                    {/* Bottom Toolbar */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        {/* Attachment Button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessingFiles || !pdfJsReady}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isProcessingFiles ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Paperclip className="w-4 h-4" />
                            )}
                            {language === 'zh' ? '添加附件' : 'Add Attachment'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileUpload(e.target.files)}
                        />

                        {/* Image count */}
                        {processedImages.length > 0 && (
                            <span className="text-xs text-indigo-600 font-medium">
                                {processedImages.length} {language === 'zh' ? '张图片' : 'images'}
                            </span>
                        )}

                        {/* Character Count */}
                        <span className="text-xs text-slate-400">
                            {paperContent.length} {language === 'zh' ? '字符' : 'chars'}
                        </span>
                    </div>
                </div>

                {/* Uploaded Files */}
                <AnimatePresence>
                    {uploadedFiles.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-slate-700">
                                    {language === 'zh' ? '已添加附件:' : 'Attachments:'}
                                </p>
                                <button
                                    onClick={clearAllFiles}
                                    className="text-xs text-red-500 hover:text-red-700"
                                >
                                    {language === 'zh' ? '清除全部' : 'Clear all'}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {uploadedFiles.map((file, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="relative group flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200"
                                    >
                                        {file.preview ? (
                                            <img
                                                src={file.preview}
                                                alt={file.name}
                                                className="w-8 h-8 object-cover rounded"
                                            />
                                        ) : file.type.includes('pdf') ? (
                                            <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                                        ) : (
                                            <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        )}
                                        <span className="text-sm text-slate-600 max-w-[150px] truncate">
                                            {file.name}
                                        </span>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="ml-1 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hint */}
                <p className="mt-3 text-xs text-slate-400">
                    {language === 'zh'
                        ? '💡 提示：可以同时输入文字描述和上传文档（PDF/图片），PDF 会自动转换为图片发送给 AI'
                        : '💡 Tip: You can enter text and upload documents (PDF/images). PDFs will be automatically converted to images.'}
                </p>

                {/* Generate Button */}
                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || isProcessingFiles || (!paperContent.trim() && processedImages.length === 0)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 transition-transform"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('generating')}
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                {t('generateBlueprint')}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
