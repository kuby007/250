// ui.js - 用户界面渲染和交互（优化版）

window.renderLogs = function() {
    const logContent = document.getElementById('logContent');
    const userSteps = (steps) => steps.filter(s => s.type !== 'API');
    logContent.innerHTML = window.operationLogs.length ? window.operationLogs.map(op => {
        const steps = userSteps(op.steps);
        return `
        <details class="log-entry" ${op.id === window.currentOperation?.id ? 'open' : ''}>
            <summary><span class="font-medium">${op.title}</span> <span class="text-xs text-gray-500 ml-2">${steps.length}步</span></summary>
            <div class="log-details">
                ${steps.map(s => `<div><span class="text-gray-500">[${s.timestamp}]</span> <span class="${s.type === 'ERROR' ? 'text-red-600' : s.type === 'START' ? 'text-blue-600' : 'text-green-600'}">${s.type}</span> ${s.message} ${s.details ? '<br><span class="text-xs text-gray-400">'+s.details+'</span>' : ''}</div>`).join('')}
            </div>
        </details>
    `}).join('') : '<div class="text-gray-400">暂无日志</div>';
};

window.showContextMenu = function(e, path, type, isEditable) {
    e.preventDefault();
    window.contextMenuTarget = { path, type, isEditable };
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';
};

window.updateToolbar = function() {
    const count = window.selectedItems.size;
    const disabled = count === 0;
    const actionDropdownBtn = document.getElementById('actionDropdownBtn');
    const renameBtn = document.getElementById('renameBtn');
    const moveBtn = document.getElementById('moveBtn');
    const copyBtn = document.getElementById('copyBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const selectionInfo = document.getElementById('selectionInfo');
    actionDropdownBtn.disabled = disabled;
    renameBtn.disabled = count !== 1;
    moveBtn.disabled = disabled;
    copyBtn.disabled = disabled;
    deleteBtn.disabled = disabled;
    downloadBtn.disabled = false;
    selectionInfo.innerText = count === 0 ? '未选中任何项' : `已选中 ${count} 项`;
};

window.clearSelection = function() {
    window.selectedItems.clear();
    document.querySelectorAll('.file-row').forEach(row => {
        row.classList.remove('selected');
        const cb = row.querySelector('.file-checkbox');
        if (cb) cb.checked = false;
    });
    window.updateToolbar();
};

window.renderRepoList = function() {
    const repoListDiv = document.getElementById('repoList');
    const repoFilter = document.getElementById('repoFilter');
    if (!window.allRepos.length) {
        repoListDiv.innerHTML = '<div class="text-gray-500 text-center py-4">暂无仓库</div>';
        return;
    }
    const filterText = repoFilter.value.toLowerCase();
    const filtered = window.allRepos.filter(repo => {
        const nameMatch = repo.full_name.toLowerCase().includes(filterText);
        if (window.repoFilterType === 'all') return nameMatch;
        if (window.repoFilterType === 'private') return nameMatch && repo.private;
        if (window.repoFilterType === 'public') return nameMatch && !repo.private;
    });
    let html = '';
    filtered.forEach(repo => {
        const active = window.currentRepo === repo.full_name ? 'bg-blue-100' : '';
        html += `<div class="p-2 rounded cursor-pointer hover:bg-gray-100 ${active}" data-repo="${repo.full_name}">
            <i class="fas fa-${repo.private ? 'lock' : 'lock-open'} text-xs mr-1 ${repo.private ? 'text-yellow-600' : 'text-gray-500'}"></i>
            <span class="font-medium">${repo.name}</span>
            <span class="text-xs text-gray-500 ml-1">${repo.owner.login}</span>
            ${repo.accountAlias ? `<span class="text-xs bg-gray-200 px-1 rounded ml-1">${repo.accountAlias}</span>` : ''}
        </div>`;
    });
    repoListDiv.innerHTML = html;
    repoListDiv.querySelectorAll('[data-repo]').forEach(el => {
        el.addEventListener('click', () => {
            window.currentRepo = el.dataset.repo;
            window.currentPath = '';
            window.loadContents(true);
            repoListDiv.querySelectorAll('[data-repo]').forEach(e => e.classList.remove('bg-blue-100'));
            el.classList.add('bg-blue-100');
        });
    });
};

window.renderFileList = function() {
    const fileListDiv = document.getElementById('fileList');
    const fileFilter = document.getElementById('fileFilter');
    if (!window.contents) return;
    const filter = fileFilter.value.toLowerCase();
    const filtered = window.contents.filter(item => item.name.toLowerCase().includes(filter));
    let html = `<table class="w-full text-sm"><thead><tr class="bg-gray-100 border-b"><th class="p-2 text-left w-8"><input type="checkbox" id="selectAll"></th><th class="p-2 text-left">名称</th><th class="p-2 text-left">类型</th><th class="p-2 text-left">大小</th><th class="p-2 text-left">操作</th></tr></thead><tbody>`;
    filtered.forEach(item => {
        const isDir = item.type === 'dir';
        const name = item.name;
        const path = item.path;
        const size = item.size ? (item.size < 1024 ? item.size + ' B' : (item.size/1024).toFixed(1) + ' KB') : '-';
        const editable = !isDir && window.isEditableFile(name, item.size);
        const downloadUrl = item.download_url || '';
        html += `<tr class="file-row border-b hover:bg-gray-50 ${window.selectedItems.has(path) ? 'selected' : ''}" data-path="${path}" data-type="${item.type}" data-editable="${editable}" ondblclick="if(this.dataset.editable === 'true') window.openEditor('${window.currentRepo}', '${path}')" oncontextmenu="window.showContextMenu(event, '${path}', '${item.type}', ${editable})">`;
        html += `<td class="p-2"><input type="checkbox" class="file-checkbox" data-path="${path}" ${window.selectedItems.has(path) ? 'checked' : ''}></td>`;
        html += `<td class="p-2"><i class="fas fa-${isDir ? 'folder' : 'file'} mr-2 ${isDir ? 'text-yellow-500' : 'text-gray-500'}"></i>`;
        if (isDir) {
            html += `<a href="#" class="folder-link text-blue-600 hover:underline">${name}</a>`;
        } else {
            html += `<span>${name}</span>`;
        }
        html += `</td>`;
        html += `<td class="p-2">${isDir ? '文件夹' : '文件'}</td>`;
        html += `<td class="p-2">${size}</td>`;
// 在 renderFileList 中，找到操作列的 td 部分（action-cell）
html += `<td class="p-2 action-cell">`;
if (!isDir) {
    if (editable) {
        html += `<button class="edit-btn text-blue-600 hover:text-blue-800 text-xs mr-1" data-path="${path}" data-name="${name}"><i class="fas fa-edit mr-1"></i>编辑</button>`;
    }
    html += `<button class="history-btn text-purple-600 hover:text-purple-800 text-xs mr-1" data-path="${path}" data-name="${name}"><i class="fas fa-history mr-1"></i>历史</button>`;
    if (window.isArchiveFile(name) || window.isMultiPartArchive(name)) {
        html += `<button class="extract-btn text-blue-600 hover:text-blue-800 text-xs mr-1" data-path="${path}" data-name="${name}"><i class="fas fa-file-archive mr-1"></i>解压</button>`;
    }
    // 新增：文件复制链接按钮
    html += `<button class="copy-link-btn text-green-600 hover:text-green-800 text-xs mr-1" data-path="${path}" data-url="${downloadUrl}" data-name="${name}"><i class="fas fa-link mr-1"></i>复制链接</button>`;
    // 原有加速下载火箭按钮
    html += `<button class="accelerate-download text-blue-600 hover:text-blue-800 text-xs mr-1" data-url="${downloadUrl}" data-name="${name}" ><i class="fas fa-rocket">加速下载</i></button>`;
} else {
    // 文件夹：添加复制链接按钮（复制文件夹内所有文件的加速链接）
    html += `<button class="copy-folder-link-btn text-green-600 hover:text-green-800 text-xs" data-path="${path}" data-name="${name}"><i class="fas fa-link mr-1"></i>复制链接</button>`;
}
html += `</td>`;
        html += `</tr>`;
    });
    html += '</tbody></table>';
    fileListDiv.innerHTML = html;

    // 绑定事件（原有基础上增加 accelerate-download 处理）
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const path = btn.dataset.path;
            window.openEditor(window.currentRepo, path);
        });
    });
    // 新增：加速下载事件
    document.querySelectorAll('.accelerate-download').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            if (url) {
                const accUrl = window.getAcceleratedUrl(url);
                window.open(accUrl, '_blank');
            }
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const path = btn.dataset.path;
            window.openEditor(window.currentRepo, path);
        });
    });
// 在 renderFileList 的事件绑定区域（.edit-btn 绑定之后）添加
document.querySelectorAll('.history-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = btn.dataset.path;
        const name = btn.dataset.name;
        window.showFileHistory(window.currentRepo, path, name);
    });
});
// 在 renderFileList 的事件绑定区域（history-btn 之后）添加
document.querySelectorAll('.copy-link-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        const name = btn.dataset.name;
        if (url) {
            const accUrl = window.getAcceleratedUrl(url);
            window.copyToClipboard(accUrl, `文件 ${name} 的加速链接已复制`);
        } else {
            window.showMessage('无法获取文件下载链接', true);
        }
    });
});

document.querySelectorAll('.copy-folder-link-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const path = btn.dataset.path;
        const name = btn.dataset.name;
        await window.copyFolderLinks(window.currentRepo, path, name);
    });
});
    document.querySelectorAll('.file-checkbox').forEach(cb => {
        cb.addEventListener('click', (e) => {
            e.stopPropagation();
            const path = cb.dataset.path;
            if (cb.checked) {
                window.selectedItems.add(path);
            } else {
                window.selectedItems.delete(path);
            }
            updateRowSelection();
            window.updateToolbar();
        });
    });

    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            const checked = e.target.checked;
            if (checked) {
                filtered.forEach(item => window.selectedItems.add(item.path));
            } else {
                window.selectedItems.clear();
            }
            updateRowSelection();
            window.updateToolbar();
        });
    }

    document.querySelectorAll('.file-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-checkbox') || e.target.classList.contains('folder-link') || e.target.closest('.edit-btn') || e.target.closest('.extract-btn')) return;
            const cb = row.querySelector('.file-checkbox');
            if (cb) {
                cb.checked = !cb.checked;
                const path = cb.dataset.path;
                if (cb.checked) {
                    window.selectedItems.add(path);
                } else {
                    window.selectedItems.delete(path);
                }
                updateRowSelection();
                window.updateToolbar();
            }
        });
    });

    fileListDiv.querySelectorAll('.folder-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const path = link.closest('tr').dataset.path;
            window.currentPath = path;
            window.loadContents(true);
            window.clearSelection();
        });
    });

    fileListDiv.querySelectorAll('.extract-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const path = btn.dataset.path;
            const name = btn.dataset.name;
            window.openExtractModal(window.currentRepo, path, name);
        });
    });

    function updateRowSelection() {
        document.querySelectorAll('.file-row').forEach(row => {
            const cb = row.querySelector('.file-checkbox');
            const path = cb?.dataset.path;
            if (path && window.selectedItems.has(path)) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
        if (selectAll) {
            const total = document.querySelectorAll('.file-checkbox').length;
            const checked = window.selectedItems.size;
            selectAll.checked = total === checked && total > 0;
            selectAll.indeterminate = checked > 0 && checked < total;
        }
    }
};

window.renderBreadcrumb = function() {
    const breadcrumbDiv = document.getElementById('breadcrumb');
    if (!window.currentRepo) return;
    const parts = window.currentPath.split('/').filter(p => p);
    let html = `<a href="#" data-path="" class="text-blue-600 hover:underline">${window.currentRepo}</a>`;
    let accum = '';
    parts.forEach((part, idx) => {
        accum += (accum ? '/' : '') + part;
        html += ` <span class="text-gray-400">/</span> <a href="#" data-path="${accum}" class="text-blue-600 hover:underline">${part}</a>`;
    });
    breadcrumbDiv.innerHTML = html;
    breadcrumbDiv.querySelectorAll('a[data-path]').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            window.currentPath = a.dataset.path;
            window.loadContents(true);
            window.clearSelection();
        });
    });
};

window.openEditor = async function(repo, path) {
    if (!repo || !path) return;
    const [owner, repoName] = repo.split('/');
    try {
        const data = await window.apiCall(`https://api.github.com/repos/${owner}/${repoName}/contents/${path}`);
        if (!data.content) {
            window.showMessage('无法读取文件内容', true);
            return;
        }
        const binaryString = atob(data.content.replace(/\n/g, ''));
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        const content = new TextDecoder('utf-8').decode(bytes);
        window.currentEditPath = path;
        window.currentEditRepo = repo;
        window.currentEditSha = data.sha;
        window.currentEditDownloadUrl = data.download_url || '';

        const editorTitle = document.getElementById('editorTitle');
        const editorContainer = document.getElementById('editorContainer');
        editorTitle.textContent = `编辑: ${path}`;
        
        // 清空容器
        editorContainer.innerHTML = '';
        
        // 确保容器有高度
        editorContainer.style.height = 'calc(100vh - 200px)';
        editorContainer.style.minHeight = '400px';
        
        // 创建编辑器
        window.editor = CodeMirror(editorContainer, {
            value: content,
            lineNumbers: true,
            mode: window.guessMode(path),
            theme: 'monokai',
            lineWrapping: true,
            viewportMargin: Infinity  // 确保所有内容都可渲染
        });

        // 显示模态框
        const editorModal = document.getElementById('editorModal');
        editorModal.classList.remove('hidden');
        editorModal.classList.add('flex');
        
        // 强制刷新编辑器（多次刷新确保正确渲染）
        setTimeout(() => {
            if (window.editor) {
                window.editor.refresh();
                // 再次刷新以确保高度计算正确
                setTimeout(() => {
                    if (window.editor) window.editor.refresh();
                }, 100);
            }
        }, 50);
        
    } catch (err) {
        window.showMessage('加载文件失败: ' + err.message, true);
    }
};

// 打开路径选择模态框（复制/移动）
window.openPathModal = async function(title, sourceRepo, sourcePaths, isMove, callback) {
    const modalTitle = document.getElementById('modalTitle');
    const currentPathInfo = document.getElementById('currentPathInfo');
    const modalTargetRepo = document.getElementById('modalTargetRepo');
    const modalTargetPath = document.getElementById('modalTargetPath');
    const modalTree = document.getElementById('modalTree');
    const treeContent = document.getElementById('treeContent');
    const extractFields = document.getElementById('extractFields');
    const modalConflictFields = document.getElementById('modalConflictFields');
    const pathModal = document.getElementById('pathModal');
    modalTitle.innerText = title;
    window.modalSourceRepo = sourceRepo;
    window.modalSourcePaths = sourcePaths;
    window.modalIsMove = isMove;
    window.modalIsExtract = false;
    extractFields.classList.add('hidden');
    // 判断选中项是否全是文件
    const allFiles = sourcePaths.every(path => window.contents.find(c => c.path === path)?.type === 'file');
    window.modalAllFiles = allFiles;
    
    // 动态生成冲突选项（内容在确认时根据检测结果决定是否显示，此处先留空）
    modalConflictFields.innerHTML = ''; 
    modalConflictFields.classList.add('hidden'); // 默认隐藏

    currentPathInfo.innerHTML = `当前仓库: <strong>${sourceRepo}</strong><br>当前路径: <strong>/${window.currentPath}</strong>`;

    modalTargetRepo.innerHTML = '';
    window.allRepos.forEach(r => {
        const option = document.createElement('option');
        option.value = r.full_name;
        option.textContent = r.full_name;
        if (r.full_name === sourceRepo) option.selected = true;
        modalTargetRepo.appendChild(option);
    });

    modalTargetPath.value = '';
    modalTree.classList.add('hidden');
    treeContent.innerHTML = '';
    pathModal.classList.remove('hidden');
    pathModal.classList.add('flex');
    window.modalCallback = callback;
};

// 打开解压模态框
window.openExtractModal = function(sourceRepo, filePath, fileName) {
    const modalTitle = document.getElementById('modalTitle');
    const currentPathInfo = document.getElementById('currentPathInfo');
    const modalTargetRepo = document.getElementById('modalTargetRepo');
    const modalTargetPath = document.getElementById('modalTargetPath');
    const modalTree = document.getElementById('modalTree');
    const treeContent = document.getElementById('treeContent');
    const extractFields = document.getElementById('extractFields');
    const modalConflictFields = document.getElementById('modalConflictFields');
    const modalSplitPattern = document.getElementById('modalSplitPattern');
    const pathModal = document.getElementById('pathModal');
    modalTitle.innerText = '解压压缩包';
    window.modalSourceRepo = sourceRepo;
    window.modalSourcePaths = [filePath];
    window.modalIsExtract = true;
    extractFields.classList.remove('hidden');
    
    // 解压冲突选项同样默认隐藏
    modalConflictFields.innerHTML = '';
    modalConflictFields.classList.add('hidden');

    currentPathInfo.innerHTML = `当前仓库: <strong>${sourceRepo}</strong><br>当前路径: <strong>/${window.currentPath}</strong>`;

    let pattern = fileName;
    if (window.isMultiPartArchive(fileName)) {
        if (fileName.includes('.part1.rar')) pattern = '*.part1.rar';
        else if (fileName.includes('.zip.001')) pattern = '*.zip.001';
        else if (fileName.includes('.7z.001')) pattern = '*.7z.001';
    }
    modalSplitPattern.value = pattern;

    modalTargetRepo.innerHTML = '';
    window.allRepos.forEach(r => {
        const option = document.createElement('option');
        option.value = r.full_name;
        option.textContent = r.full_name;
        if (r.full_name === sourceRepo) option.selected = true;
        modalTargetRepo.appendChild(option);
    });
    const dir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
    modalTargetPath.value = dir;
    modalTree.classList.add('hidden');
    treeContent.innerHTML = '';
    pathModal.classList.remove('hidden');
    pathModal.classList.add('flex');
};

window.browseTree = async function(repoFull, path) {
    window.browsingRepo = repoFull;
    window.browsingPath = path;
    const [owner, repo] = repoFull.split('/');
    const modalTargetPath = document.getElementById('modalTargetPath');
    const modalTree = document.getElementById('modalTree');
    const treeContent = document.getElementById('treeContent');
    try {
        const data = await window.apiCall(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {}, 3, 120000, true);
        if (!Array.isArray(data)) return;
        const dirs = data.filter(item => item.type === 'dir');
        let html = '';
        if (path) {
            const parent = path.split('/').slice(0, -1).join('/');
            html += `<div class="tree-item text-blue-600" data-path="${parent}"><i class="fas fa-level-up-alt mr-1"></i> ..</div>`;
        }
        dirs.forEach(dir => {
            html += `<div class="tree-item pl-4" data-path="${dir.path}"><i class="fas fa-folder text-yellow-500 mr-1"></i> ${dir.name}</div>`;
        });
        treeContent.innerHTML = html;
        modalTree.classList.remove('hidden');
        treeContent.querySelectorAll('.tree-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const newPath = el.dataset.path;
                window.browseTree(repoFull, newPath);
                modalTargetPath.value = newPath;
            });
        });
    } catch (err) {
        window.showMessage('加载目录失败: ' + err.message, true);
    }
};
// ---------- 文件历史功能 ----------
window.showFileHistory = async function(repoFull, filePath, fileName) {
    const historyModal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');
    const historyTitle = document.getElementById('historyTitle');
    historyTitle.innerText = `修改历史: ${fileName || filePath}`;
    historyList.innerHTML = '<div class="text-center py-4">加载中...</div>';
    historyModal.classList.remove('hidden');
    historyModal.classList.add('flex');

    try {
        const commits = await window.getFileCommits(repoFull, filePath);
        if (commits.length === 0) {
            historyList.innerHTML = '<div class="text-center py-4 text-gray-500">暂无修改记录</div>';
            return;
        }
        let html = '';
        for (const commit of commits) {
            const date = new Date(commit.date).toLocaleString();
            html += `
                <div class="border rounded p-3 hover:bg-gray-50 cursor-pointer commit-item" data-sha="${commit.sha}" data-message="${escapeHtml(commit.message)}">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="font-mono text-xs text-gray-500">${commit.sha.substring(0,7)}</div>
                            <div class="font-medium">${escapeHtml(commit.message.split('\n')[0])}</div>
                            <div class="text-xs text-gray-500 mt-1">${escapeHtml(commit.author)} · ${date}</div>
                        </div>
                        <button class="view-version-btn bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs" data-sha="${commit.sha}">查看内容</button>
                    </div>
                </div>
            `;
        }
        historyList.innerHTML = html;

        // 绑定查看内容事件
        document.querySelectorAll('.view-version-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const sha = btn.dataset.sha;
                await window.showHistoryContent(repoFull, filePath, sha);
            });
        });
    } catch (err) {
        historyList.innerHTML = `<div class="text-center py-4 text-red-600">加载失败: ${err.message}</div>`;
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

window.showHistoryContent = async function(repoFull, filePath, commitSha) {
    const modal = document.getElementById('historyContentModal');
    const pre = document.getElementById('historyContentPre');
    const titleSpan = document.getElementById('historyContentTitle');
    titleSpan.innerText = `版本 ${commitSha.substring(0,7)} - ${filePath}`;
    pre.innerText = '加载中...';
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    let currentContent = null;
    try {
        const content = await window.getFileContentAtCommit(repoFull, filePath, commitSha);
        currentContent = content;
        pre.innerText = content;
    } catch (err) {
        pre.innerText = `加载失败: ${err.message}`;
    }

    // 回滚按钮
    const rollbackBtn = document.getElementById('rollbackToVersionBtn');
    const newRollbackBtn = rollbackBtn.cloneNode(true);
    rollbackBtn.parentNode.replaceChild(newRollbackBtn, rollbackBtn);
newRollbackBtn.addEventListener('click', async () => {
    if (!confirm(`确定将文件回滚到版本 ${commitSha.substring(0,7)} 吗？`)) return;
    try {
        await window.rollbackFileToCommit(repoFull, filePath, commitSha, `Rollback to ${commitSha.substring(0,7)}`);
        window.showMessage('回滚成功，正在刷新...');
        modal.classList.add('hidden');
        document.getElementById('historyModal').classList.add('hidden');
        await window.loadContents(true);
    } catch (err) {
        console.error('回滚失败详情:', err);  // 输出到控制台方便调试
        window.showMessage('回滚失败: ' + err.message, true);
    }
});
};

// 关闭历史模态框
document.getElementById('closeHistoryBtn')?.addEventListener('click', () => {
    document.getElementById('historyModal').classList.add('hidden');
});
document.getElementById('historyModalCloseBtn')?.addEventListener('click', () => {
    document.getElementById('historyModal').classList.add('hidden');
});
document.getElementById('closeHistoryContentBtn')?.addEventListener('click', () => {
    document.getElementById('historyContentModal').classList.add('hidden');
});
document.getElementById('closeHistoryContentModalBtn')?.addEventListener('click', () => {
    document.getElementById('historyContentModal').classList.add('hidden');
});
// ---------- 复制到剪贴板 ----------
window.copyToClipboard = async function(text, successMsg) {
    try {
        await navigator.clipboard.writeText(text);
        window.showMessage(successMsg || '已复制到剪贴板');
    } catch (err) {
        window.showMessage('复制失败: ' + err.message, true);
    }
};

// ---------- 递归收集文件夹内所有文件的加速链接 ----------
window.collectFolderLinks = async function(repoFull, folderPath, collectedLinks = []) {
    const [owner, repo] = repoFull.split('/');
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`;
    const data = await window.apiCall(url);
    if (!Array.isArray(data)) {
        // 如果是文件（理论上不会是单个文件）
        if (data.download_url) {
            collectedLinks.push(window.getAcceleratedUrl(data.download_url));
        }
        return collectedLinks;
    }
    for (const item of data) {
        if (item.type === 'dir') {
            await window.collectFolderLinks(repoFull, item.path, collectedLinks);
        } else if (item.type === 'file' && item.download_url) {
            collectedLinks.push(window.getAcceleratedUrl(item.download_url));
        }
    }
    return collectedLinks;
};

// ---------- 复制文件夹内所有文件的加速链接 ----------
window.copyFolderLinks = async function(repoFull, folderPath, folderName) {
    window.startOperation(`获取文件夹 ${folderName} 的下载链接`);
    window.updateProgress(10, '正在扫描文件夹...', '收集链接');
    try {
        const links = await window.collectFolderLinks(repoFull, folderPath);
        if (links.length === 0) {
            window.showMessage('文件夹中没有可获取链接的文件', true);
            window.endOperation(false);
            window.hideProgress();
            return;
        }
        const linkText = links.join('\n');
        await window.copyToClipboard(linkText, `已复制 ${links.length} 个文件链接`);
        window.endOperation(true);
    } catch (err) {
        window.showMessage('获取文件夹链接失败: ' + err.message, true);
        window.abortOperation(err.message);
    } finally {
        window.hideProgress();
    }
};

// ---------- 批量复制选中项目的链接 ----------
window.copySelectedLinks = async function() {
    if (window.selectedItems.size === 0) {
        window.showMessage('请先选中项目', true);
        return;
    }
    window.startOperation(`复制选中项目链接 (${window.selectedItems.size} 项)`);
    window.updateProgress(0, '正在收集链接...', '批量复制链接');
    const allLinks = [];
    let processed = 0;
    const items = Array.from(window.selectedItems);
    for (const path of items) {
        const item = window.contents.find(c => c.path === path);
        if (!item) continue;
        try {
            if (item.type === 'dir') {
                const links = await window.collectFolderLinks(window.currentRepo, path);
                allLinks.push(...links);
            } else if (item.type === 'file' && item.download_url) {
                allLinks.push(window.getAcceleratedUrl(item.download_url));
            }
            processed++;
            window.updateProgress(Math.round((processed / items.length) * 100), `处理中 ${processed}/${items.length}`, '批量复制链接');
        } catch (err) {
            window.addLogStep('WARN', `获取 ${path} 链接失败: ${err.message}`);
        }
    }
    if (allLinks.length === 0) {
        window.showMessage('没有找到可复制的链接', true);
        window.endOperation(false);
        window.hideProgress();
        return;
    }
    const linkText = allLinks.join('\n');
    await window.copyToClipboard(linkText, `已复制 ${allLinks.length} 个链接`);
    window.endOperation(true);
    window.hideProgress();
};
