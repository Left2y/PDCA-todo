// 录音服务 - MediaRecorder 封装
import logger from './logger';

const MODULE = 'Recorder';

export interface RecorderState {
    isRecording: boolean;
    duration: number;
    error: string | null;
}

// 支持的 MIME 类型，按优先级排序
const MIME_TYPES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
];

class RecorderService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private startTime: number = 0;
    private timerInterval: number | null = null;
    private supportedMimeType: string = '';

    // 状态回调
    private onStateChange: ((state: RecorderState) => void) | null = null;
    private currentState: RecorderState = {
        isRecording: false,
        duration: 0,
        error: null,
    };

    constructor() {
        if (typeof window !== 'undefined') {
            this.detectMimeType();
        }
    }

    // 探测支持的 MIME 类型
    private detectMimeType(): void {
        logger.info(MODULE, '开始探测支持的 MIME 类型');

        for (const mimeType of MIME_TYPES) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                this.supportedMimeType = mimeType;
                logger.info(MODULE, `检测到支持的 MIME 类型`, { mimeType });
                return;
            }
        }

        // 如果都不支持，使用默认
        this.supportedMimeType = '';
        logger.warn(MODULE, '未检测到明确支持的 MIME 类型，将使用浏览器默认');
    }

    // 获取支持的 MIME 类型
    getSupportedMimeType(): string {
        return this.supportedMimeType;
    }

    // 设置状态变化回调
    setStateChangeCallback(callback: (state: RecorderState) => void): void {
        this.onStateChange = callback;
    }

    // 更新状态
    private updateState(partial: Partial<RecorderState>): void {
        this.currentState = { ...this.currentState, ...partial };
        this.onStateChange?.(this.currentState);
    }

    // 开始录音
    async start(): Promise<void> {
        logger.info(MODULE, '开始录音');

        try {
            // 请求麦克风权限
            logger.debug(MODULE, '请求麦克风权限');
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
            logger.info(MODULE, '麦克风权限获取成功');

            // 创建 MediaRecorder
            const options: MediaRecorderOptions = {};
            if (this.supportedMimeType) {
                options.mimeType = this.supportedMimeType;
            }

            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.audioChunks = [];

            logger.debug(MODULE, 'MediaRecorder 配置', {
                mimeType: this.mediaRecorder.mimeType,
                state: this.mediaRecorder.state,
            });

            // 数据可用时收集
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    logger.debug(MODULE, '收到音频数据块', { size: event.data.size });
                }
            };

            // 录音停止时
            this.mediaRecorder.onstop = () => {
                logger.info(MODULE, '录音已停止', { chunks: this.audioChunks.length });
            };

            // 错误处理
            this.mediaRecorder.onerror = (event) => {
                const error = (event as ErrorEvent).message || '录音错误';
                logger.error(MODULE, '录音错误', { error });
                this.updateState({ error, isRecording: false });
            };

            // 开始录音
            this.mediaRecorder.start(1000); // 每秒收集一次数据
            this.startTime = Date.now();

            // 启动计时器
            this.timerInterval = window.setInterval(() => {
                const duration = Math.floor((Date.now() - this.startTime) / 1000);
                this.updateState({ duration });

                // 5 分钟限制
                if (duration >= 300) {
                    logger.warn(MODULE, '达到 5 分钟录音上限，自动停止');
                    this.stop();
                }
            }, 1000);

            this.updateState({ isRecording: true, duration: 0, error: null });
            logger.info(MODULE, '录音已开始');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '无法访问麦克风';
            logger.error(MODULE, '启动录音失败', { error: errorMessage });
            this.updateState({ error: errorMessage, isRecording: false });
            throw error;
        }
    }

    // 停止录音
    stop(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            logger.info(MODULE, '停止录音');

            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                const error = '录音器未激活';
                logger.error(MODULE, error);
                reject(new Error(error));
                return;
            }

            // 清除计时器
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }

            this.mediaRecorder.onstop = () => {
                logger.info(MODULE, '录音停止完成，合并音频块', {
                    chunks: this.audioChunks.length,
                    mimeType: this.mediaRecorder?.mimeType,
                });

                const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });

                logger.info(MODULE, '音频 Blob 创建成功', {
                    size: audioBlob.size,
                    type: audioBlob.type,
                });

                // 释放资源
                this.cleanup();
                this.updateState({ isRecording: false });

                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    // 清理资源
    private cleanup(): void {
        logger.debug(MODULE, '清理录音资源');

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.mediaRecorder = null;
    }

    // 取消录音
    cancel(): void {
        logger.info(MODULE, '取消录音');

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        this.cleanup();
        this.audioChunks = [];
        this.updateState({ isRecording: false, duration: 0, error: null });
    }

    // 检查是否正在录音
    isRecording(): boolean {
        return this.currentState.isRecording;
    }

    // 获取当前状态
    getState(): RecorderState {
        return { ...this.currentState };
    }
}

// 单例导出
export const recorder = new RecorderService();
export default recorder;
