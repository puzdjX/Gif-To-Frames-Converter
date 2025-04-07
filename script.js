let currentFrameIndex = 0; // 当前帧索引
let frameUrls = []; // 存储所有帧URL
let framesPerChunk = 10; // 每批加载的帧数
let currentChunk = 0; // 当前批次
let isProcessing = false; // 是否正在处理
let totalFrames = 0; // 总帧数
let gif = null; // SuperGif实例
let modalImage = null; // 模态框图片引用
let scale = 1; // 模态框图片当前缩放比例
let isCtrlPressed = false; // 是否按下Ctrl键
let mouseX = 0,
    mouseY = 0; // 鼠标位置

// 页面加载时检查保存的主题偏好
document.addEventListener("DOMContentLoaded", function () {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        document.getElementById("moonIcon").style.display = "none";
        document.getElementById("sunIcon").style.display = "block";
        document
            .getElementById("themeToggle")
            .setAttribute("title", "切换亮色模式");
    }
});

// 主题切换
const themeToggle = document.getElementById("themeToggle");
const moonIcon = document.getElementById("moonIcon");
const sunIcon = document.getElementById("sunIcon");

themeToggle.addEventListener("click", () => {
    const isDarkMode = document.body.classList.toggle("dark-mode");

    if (isDarkMode) {
        moonIcon.style.display = "none";
        sunIcon.style.display = "block";
        themeToggle.setAttribute("title", "切换亮色模式");
        localStorage.setItem("theme", "dark");
    } else {
        moonIcon.style.display = "block";
        sunIcon.style.display = "none";
        themeToggle.setAttribute("title", "切换暗黑模式");
        localStorage.setItem("theme", "light");
    }
});

// 帮助按钮
const helpButton = document.getElementById("helpButton");
const manualModal = document.getElementById("manualModal");
const manualClose = manualModal.querySelector(".modal-close");

helpButton.addEventListener("click", () => {
    manualModal.style.display = "flex";
});

manualClose.addEventListener("click", () => {
    manualModal.style.display = "none";
});

manualModal.addEventListener("click", (event) => {
    if (event.target === manualModal) {
        manualModal.style.display = "none";
    }
});

// 返回顶部按钮
const backToTopButton = document.getElementById("backToTop");
window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
        backToTopButton.style.display = "flex";
    } else {
        backToTopButton.style.display = "none";
    }
});

backToTopButton.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
});

// 处理Ctrl键用于像素颜色检测
document.addEventListener("keydown", (event) => {
    if (event.key === "Control") {
        isCtrlPressed = true;
        document.getElementById("pixelColor").style.display = "block";
    }
});

document.addEventListener("keyup", (event) => {
    if (event.key === "Control") {
        isCtrlPressed = false;
        document.getElementById("pixelColor").style.display = "none";
    }
});

// 处理鼠标滚轮缩放
const modal = document.getElementById("modal");
modal.addEventListener("wheel", (event) => {
    if (modalImage) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.max(0.5, Math.min(3, scale + delta));
        modalImage.style.transform = `scale(${scale})`;
    }
});

// 处理鼠标移动用于像素颜色检测
modal.addEventListener("mousemove", (event) => {
    if (isCtrlPressed && modalImage) {
        const transform = window.getComputedStyle(modalImage).transform;
        const matrix = transform.match(/matrix\((.+)\)/);

        // 解析缩放矩阵
        let scaleX = 1, scaleY = 1;
        if (matrix) {
            const values = matrix[1].split(', ').map(Number);
            scaleX = Math.sqrt(values[0] ** 2 + values[1] ** 2);
            scaleY = Math.sqrt(values[2] ** 2 + values[3] ** 2);
        }

        // 获取精确位置
        const rect = modalImage.getBoundingClientRect();
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || document.documentElement.scrollTop;

        // 计算实际像素坐标
        const x = Math.floor(
            ((event.clientX - rect.left + scrollX - (rect.width - modalImage.naturalWidth * scaleX) / 2) / scaleX
            ));

        const y = Math.floor(
            ((event.clientY - rect.top + scrollY - (rect.height - modalImage.naturalHeight * scaleY) / 2) / scaleY
            ));

        // 边界检查
        if (x >= 0 && y >= 0 && x < modalImage.naturalWidth && y < modalImage.naturalHeight) {
            const canvas = document.createElement("canvas");
            canvas.width = modalImage.naturalWidth;
            canvas.height = modalImage.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(modalImage, 0, 0);

            const pixel = ctx.getImageData(x, y, 1, 1).data;
            document.getElementById("colorValue").textContent = `RGB: ${pixel[0]}, ${pixel[1]}, ${pixel[2]}`;
            document.getElementById("colorPreview").style.backgroundColor =
                `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
        }

        // 更新显示位置
        const pixelColorDiv = document.getElementById("pixelColor");
        pixelColorDiv.style.left = `${event.clientX + 15}px`;
        pixelColorDiv.style.top = `${event.clientY + 15}px`;
    }
});

document
    .getElementById("gifInput")
    .addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
            // 显示加载遮罩
            const loadingOverlay = document.getElementById("loadingOverlay");
            loadingOverlay.style.display = "flex";

            const reader = new FileReader();
            reader.onload = function (e) {
                const gifUrl = e.target.result;
                loadGIF(gifUrl);
            };
            reader.onerror = function () {
                showError();
            };
            reader.readAsDataURL(file);
        }
    });

function loadGIF(gifUrl) {
    const framesContainer = document.getElementById("framesContainer");
    framesContainer.innerHTML = ""; // 清空之前的帧

    // 重置进度条
    const progressBarFill = document.getElementById("progressBarFill");
    progressBarFill.style.width = "0%";

    // 创建图片元素
    const img = document.createElement("img");
    img.src = gifUrl;

    // 等待图片加载
    img.onload = function () {
        // 创建SuperGif对象
        gif = new SuperGif({ gif: img });

        gif.load(() => {
            totalFrames = gif.get_length(); // 获取总帧数
            frameUrls = new Array(totalFrames); // 用正确长度初始化frameUrls
            isProcessing = true;

            // 开始同步加载帧
            loadFramesSync(gif, totalFrames);
        });

        gif.onerror = function () {
            showError();
        };
    };

    img.onerror = function () {
        showError();
    };
}

function loadFramesSync(gif, frameCount) {
    if (!isProcessing) return; // 如果处理已取消则停止

    for (let i = 0; i < frameCount; i++) {
        gif.move_to(i); // 移动到特定帧
        const canvas = gif.get_canvas(); // 获取当前帧的画布

        // 创建新画布确保获取完整帧
        const fullFrameCanvas = document.createElement("canvas");
        fullFrameCanvas.width = canvas.width;
        fullFrameCanvas.height = canvas.height;
        const ctx = fullFrameCanvas.getContext("2d");

        // 将当前帧绘制到新画布上
        ctx.drawImage(canvas, 0, 0);

        // 将新画布转换为图片URL
        const frameUrl = fullFrameCanvas.toDataURL("image/png");
        frameUrls[i] = frameUrl; // 在正确索引处存储帧URL

        // 为每帧创建容器
        const frameItem = document.createElement("div");
        frameItem.className = "frame-item";

        // 为帧创建图片元素
        const frameImg = document.createElement("img");
        frameImg.src = frameUrl;
        frameImg.alt = `帧 ${i + 1}`;

        // 添加帧信息(如帧号)
        const frameInfo = document.createElement("div");
        frameInfo.className = "frame-info";
        frameInfo.textContent = `Frame ${i + 1}`;

        // 将图片和信息追加到容器
        frameItem.appendChild(frameImg);
        frameItem.appendChild(frameInfo);

        // 添加点击事件显示放大图片
        frameItem.addEventListener("click", () => {
            currentFrameIndex = i; // 设置当前帧索引
            showModal(frameUrl); // 显示带有点击帧的模态框
        });

        // 将容器追加到帧容器
        framesContainer.appendChild(frameItem);

        // 更新进度条
        const progressBarFill = document.getElementById("progressBarFill");
        const progress = ((i + 1) / frameCount) * 100;
        progressBarFill.style.width = `${progress}%`;
    }

    // 所有帧处理完成后隐藏加载遮罩
    const loadingOverlay = document.getElementById("loadingOverlay");
    loadingOverlay.style.display = "none";
    isProcessing = false;
}

// 显示带有所选帧的模态框
function showModal(frameUrl) {
    const modal = document.getElementById("modal");
    modalImage = document.getElementById("modalImage");
    modalImage.src = frameUrl;
    modal.style.display = "flex";
    scale = 1; // 重置缩放比例
    modalImage.style.transform = `scale(${scale})`;
}

// 点击关闭按钮关闭模态框
const modalClose = document.querySelector(".modal-close");
modalClose.addEventListener("click", () => {
    modal.style.display = "none";
});

// 点击模态框外部关闭
modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

// 模态框的键盘导航
document.addEventListener("keydown", (event) => {
    if (modal.style.display === "flex") {
        if (event.key === "ArrowLeft") {
            navigateFrame(-1); // 上一帧
        } else if (event.key === "ArrowRight") {
            navigateFrame(1); // 下一帧
        }
    }
});

// 模态框导航箭头
const navLeft = document.querySelector(".modal-nav.left");
const navRight = document.querySelector(".modal-nav.right");
navLeft.addEventListener("click", () => navigateFrame(-1));
navRight.addEventListener("click", () => navigateFrame(1));

// 在帧之间导航
function navigateFrame(direction) {
    currentFrameIndex += direction;
    if (currentFrameIndex < 0) {
        currentFrameIndex = frameUrls.length - 1; // 循环到最后帧
    } else if (currentFrameIndex >= frameUrls.length) {
        currentFrameIndex = 0; // 循环到第一帧
    }
    modalImage.src = frameUrls[currentFrameIndex];
}

// 显示错误消息
function showError() {
    const loadingOverlay = document.getElementById("loadingOverlay");
    const errorMessage = document.getElementById("errorMessage");
    loadingOverlay.style.display = "none";
    errorMessage.style.display = "block";

    // 3秒后隐藏错误消息
    setTimeout(() => {
        errorMessage.style.display = "none";
    }, 3000);
}

// 取消加载过程
const cancelButton = document.getElementById("cancelButton");
cancelButton.addEventListener("click", () => {
    isProcessing = false;
    const loadingOverlay = document.getElementById("loadingOverlay");
    loadingOverlay.style.display = "none";
});

// 生成雪碧图的函数
document
    .getElementById("generateSpriteButton")
    .addEventListener("click", function () {
        if (frameUrls.length === 0) {
            alert("没有可用的帧来生成雪碧图。");
            return;
        }

        // 创建一个画布来拼接所有帧
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // 假设所有帧的宽度和高度相同
        const frameWidth = gif.get_canvas().width;
        const frameHeight = gif.get_canvas().height;

        // 设置画布的大小（所有帧排列在一行）
        canvas.width = frameWidth * frameUrls.length; // 宽度为所有帧的总宽度
        canvas.height = frameHeight; // 高度为单帧高度

        // 绘制所有帧到画布上
        let x = 0;
        frameUrls.forEach((frameUrl, index) => {
            const img = new Image();
            img.src = frameUrl;
            img.onload = function () {
                ctx.drawImage(img, x, 0, frameWidth, frameHeight);
                x += frameWidth;

                // 如果是最后一帧，生成下载链接
                if (index === frameUrls.length - 1) {
                    const spriteUrl = canvas.toDataURL("image/png");
                    const downloadLink = document.createElement("a");
                    downloadLink.href = spriteUrl;
                    downloadLink.download = "sprite_sheet.png";
                    downloadLink.textContent = "下载雪碧图";
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                }
            };
        });
    });

// 添加拖拽上传的功能（整个页面）
document.addEventListener("dragover", (event) => {
    event.preventDefault(); // 阻止默认行为
    document.body.classList.add("dragover"); // 添加拖拽样式
});

document.addEventListener("dragleave", () => {
    document.body.classList.remove("dragover"); // 移除拖拽样式
});

document.addEventListener("drop", (event) => {
    event.preventDefault(); // 阻止默认行为
    document.body.classList.remove("dragover"); // 移除拖拽样式

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type === "image/gif") {
            // 显示加载遮罩
            const loadingOverlay = document.getElementById("loadingOverlay");
            loadingOverlay.style.display = "flex";

            // 使用FileReader读取文件
            const reader = new FileReader();
            reader.onload = function (e) {
                const gifUrl = e.target.result;
                loadGIF(gifUrl); // 调用与点击上传按钮相同的逻辑
            };
            reader.onerror = function () {
                showError();
            };
            reader.readAsDataURL(file);
        } else {
            alert("请拖放有效的GIF文件。"); // 如果不是GIF文件，提示用户
        }
    }
});

// 文件选择事件处理（与之前相同）
const gifInput = document.getElementById("gifInput");
gifInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        // 显示加载遮罩
        const loadingOverlay = document.getElementById("loadingOverlay");
        loadingOverlay.style.display = "flex";

        const reader = new FileReader();
        reader.onload = function (e) {
            const gifUrl = e.target.result;
            loadGIF(gifUrl);
        };
        reader.onerror = function () {
            showError();
        };
        reader.readAsDataURL(file);
    }
});