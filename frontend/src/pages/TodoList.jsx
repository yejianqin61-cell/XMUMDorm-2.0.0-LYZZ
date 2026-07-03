import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getTodos, createTodo, updateTodo, toggleTodo, deleteTodo } from '@shared/api/todos';
import { QK } from '../query/queryKeys';
import {
  localTodayDateStr,
  normalizeTodoDueDate,
  normalizeTodoDueTime,
  formatTodoDueDisplay,
} from '@shared/utils/formatTodoDue';
import { motion, AnimatePresence } from 'framer-motion';
import './TodoList.css';

const PRIORITY_LABELS = { 0: '无', 1: '低', 2: '中', 3: '高' };
const PRIORITY_LABELS_EN = ['None', 'Low', 'Med', 'High'];
const PRIORITY_COLORS = { 0: '#999', 1: '#4caf50', 2: '#ff9800', 3: '#f44336' };
const LIST_TYPES = [
  { key: 'all', labelZh: '全部', labelEn: 'All' },
  { key: 'personal', labelZh: '个人', labelEn: 'Personal' },
  { key: 'course', labelZh: '课程', labelEn: 'Course' },
  { key: 'club', labelZh: '社团', labelEn: 'Club' },
  { key: 'other', labelZh: '其他', labelEn: 'Other' },
];

function getTodoSortValue(todo) {
  const dueDate = normalizeTodoDueDate(todo.due_date);
  const dueTime = normalizeTodoDueTime(todo.due_time);
  if (!dueDate) return Number.MAX_SAFE_INTEGER;
  return new Date(`${dueDate}T${dueTime || '23:59'}:00`).getTime();
}

export default function TodoList() {
  const { isLoggedIn } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState(0);
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('');
  const [formListType, setFormListType] = useState('personal');

  const listType = filter === 'all' ? undefined : filter;
  const status = statusFilter === 'all' ? undefined : statusFilter;

  const { data, isLoading, isError } = useQuery({
    queryKey: QK.todosList({ listType, status }),
    queryFn: () => getTodos({ list_type: listType, status, pageSize: 50 }),
    enabled: isLoggedIn,
    staleTime: 30 * 1000,
  });

  const rawTodos = data?.data?.list || data?.list || data?.data || [];
  const todos = useMemo(() => {
    return [...rawTodos].sort((a, b) => {
      if (!!a.is_completed !== !!b.is_completed) return a.is_completed ? 1 : -1;
      const timeDiff = getTodoSortValue(a) - getTodoSortValue(b);
      if (timeDiff !== 0) return timeDiff;
      if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [rawTodos]);

  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateTodo(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormTitle('');
    setFormDesc('');
    setFormPriority(0);
    setFormDueDate('');
    setFormDueTime('');
    setFormListType('personal');
  };

  const openEdit = (todo) => {
    setEditId(todo.id);
    setFormTitle(todo.title);
    setFormDesc(todo.description || '');
    setFormPriority(todo.priority);
    setFormDueDate(normalizeTodoDueDate(todo.due_date));
    setFormDueTime(normalizeTodoDueTime(todo.due_time));
    setFormListType(todo.list_type);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const body = {
      title: formTitle.trim(),
      description: formDesc.trim(),
      priority: formPriority,
      due_date: formDueDate || null,
      due_time: formDueTime || null,
      list_type: formListType,
    };

    if (editId) {
      updateMutation.mutate({ id: editId, body });
    } else {
      createMutation.mutate(body);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="todolist-page">
        <div className="state-empty" style={{ paddingTop: 80 }}>
          {isZh ? '请先登录' : 'Please log in first'}
        </div>
      </div>
    );
  }

  const todayStr = localTodayDateStr();
  const isOverdue = (todo) => {
    const dueDate = normalizeTodoDueDate(todo.due_date);
    return dueDate && dueDate < todayStr && !todo.is_completed;
  };

  return (
    <div className="todolist-page">
      <div className="todolist-inner">
        <h2 className="todolist-title">{isZh ? '待办事项' : 'To-Do List'}</h2>

        <div className="todolist-filters">
          <div className="todolist-filter-row">
            {LIST_TYPES.map((listItem) => (
              <button
                key={listItem.key}
                type="button"
                className={`todolist-filter-chip${filter === listItem.key ? ' todolist-filter-chip--active' : ''}`}
                onClick={() => setFilter(listItem.key)}
              >
                {isZh ? listItem.labelZh : listItem.labelEn}
              </button>
            ))}
          </div>
          <div className="todolist-filter-row">
            {[
              { key: 'active', labelZh: '进行中', labelEn: 'Active' },
              { key: 'all', labelZh: '全部', labelEn: 'All' },
              { key: 'completed', labelZh: '已完成', labelEn: 'Done' },
            ].map((statusItem) => (
              <button
                key={statusItem.key}
                type="button"
                className={`todolist-filter-chip${statusFilter === statusItem.key ? ' todolist-filter-chip--active' : ''}`}
                onClick={() => setStatusFilter(statusItem.key)}
              >
                {isZh ? statusItem.labelZh : statusItem.labelEn}
              </button>
            ))}
          </div>
        </div>

        {!showForm && (
          <button
            type="button"
            className="todolist-add-btn pressable"
            onClick={() => setShowForm(true)}
          >
            + {isZh ? '新建待办' : 'New Todo'}
          </button>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="todolist-form"
            >
              <input
                type="text"
                className="canteen-search-input"
                style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
                placeholder={isZh ? '待办标题...' : 'Title...'}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={500}
                autoFocus
              />
              <textarea
                className="canteen-search-input"
                style={{ width: '100%', minHeight: 60, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }}
                placeholder={isZh ? '描述（可选）' : 'Description (optional)'}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
              <div className="todolist-form-row">
                <select value={formPriority} onChange={(e) => setFormPriority(parseInt(e.target.value, 10))} className="canteen-search-input" style={{ flex: 1 }}>
                  <option value="0">{isZh ? '无优先级' : 'No priority'}</option>
                  <option value="1">{isZh ? '低' : 'Low'}</option>
                  <option value="2">{isZh ? '中' : 'Medium'}</option>
                  <option value="3">{isZh ? '高' : 'High'}</option>
                </select>
                <select value={formListType} onChange={(e) => setFormListType(e.target.value)} className="canteen-search-input" style={{ flex: 1 }}>
                  <option value="personal">{isZh ? '个人' : 'Personal'}</option>
                  <option value="course">{isZh ? '课程' : 'Course'}</option>
                  <option value="club">{isZh ? '社团' : 'Club'}</option>
                  <option value="other">{isZh ? '其他' : 'Other'}</option>
                </select>
              </div>
              <div className="todolist-form-row">
                <div className="todolist-form-field">
                  <label className="todolist-form-label">{isZh ? '日期' : 'Date'}</label>
                  <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="canteen-search-input" />
                </div>
                <div className="todolist-form-field">
                  <label className="todolist-form-label">{isZh ? '时间' : 'Time'}</label>
                  <input type="time" value={formDueTime} onChange={(e) => setFormDueTime(e.target.value)} className="canteen-search-input" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="submit" className="canteen-pick-btn pressable" disabled={!formTitle.trim()} style={{ flex: 1 }}>
                  {editId ? (isZh ? '保存' : 'Save') : (isZh ? '创建' : 'Create')}
                </button>
                <button type="button" className="canteen-food-compose-btn pressable" onClick={resetForm}>
                  {isZh ? '取消' : 'Cancel'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="state-loading" style={{ paddingTop: 60 }} />
        ) : isError ? (
          <div className="state-error">{isZh ? '加载失败' : 'Load failed'}</div>
        ) : todos.length === 0 ? (
          <div className="state-empty" style={{ padding: '40px 0' }}>
            {isZh ? '暂无待办事项' : 'No to-dos yet'}
          </div>
        ) : (
          <div className="todolist-items">
            {todos.map((todo) => {
              const dueDisplay = formatTodoDueDisplay(todo.due_date, todo.due_time);
              const listTypeMeta = LIST_TYPES.find((listItem) => listItem.key === todo.list_type);

              return (
                <motion.div
                  key={todo.id}
                  layout
                  className={`todolist-item${todo.is_completed ? ' todolist-item--done' : ''}${isOverdue(todo) ? ' todolist-item--overdue' : ''}`}
                >
                  <button
                    type="button"
                    className={`todolist-checkbox${todo.is_completed ? ' todolist-checkbox--checked' : ''}`}
                    onClick={() => toggleMutation.mutate(todo.id)}
                  >
                    {todo.is_completed ? '✓' : ''}
                  </button>
                  <div className="todolist-item-body" onClick={() => openEdit(todo)} style={{ cursor: 'pointer' }}>
                    <div className="todolist-item-title" style={{ textDecoration: todo.is_completed ? 'line-through' : 'none' }}>
                      {todo.title}
                    </div>
                    {todo.description && (
                      <div className="todolist-item-desc">{todo.description}</div>
                    )}
                    <div className="todolist-item-meta-row">
                      <span className="todolist-item-priority" style={{ color: PRIORITY_COLORS[todo.priority], fontWeight: 700 }}>
                        {isZh ? PRIORITY_LABELS[todo.priority] : PRIORITY_LABELS_EN[todo.priority]}
                      </span>
                      {listTypeMeta && todo.list_type !== 'personal' && (
                        <span className="todolist-item-type">
                          {isZh ? listTypeMeta.labelZh : listTypeMeta.labelEn}
                        </span>
                      )}
                    </div>
                    {dueDisplay && (
                      <div className="todolist-item-due" style={{ color: isOverdue(todo) ? '#f44336' : 'var(--post-ios-secondary-label)' }}>
                        <span className="todolist-item-due-label">{isZh ? '截止' : 'Due'}</span>
                        <span>{dueDisplay}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="todolist-delete-btn"
                    onClick={() => deleteMutation.mutate(todo.id)}
                    title={isZh ? '删除' : 'Delete'}
                  >
                    ✕
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
