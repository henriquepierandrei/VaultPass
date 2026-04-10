/**
 * EntryForm component for creating and editing vault entries.
 * Uses react-hook-form with zod validation schema.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { VaultEntryWithHistory, EntryCategory, VaultEntry } from '@shared/types';
import { CATEGORY_LABELS } from '@shared/constants';
import { useGeneratorStore, setOnPasswordSelected } from '@renderer/store/generatorStore';

const entrySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  username: z.string().default(''),
  password: z.string().min(1, 'Password is required'),
  url: z.string().url('Invalid URL').or(z.literal('')).default(''),
  description: z.string().default(''),
  category: z.string() as z.ZodType<EntryCategory>,
  tags: z.string().default(''),
  icon: z.string().default(''),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface EntryFormProps {
  entry?: VaultEntryWithHistory | null;
  onSubmit: (data: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function EntryForm({ entry, onSubmit, onCancel, isSubmitting }: EntryFormProps): JSX.Element {
  const { setOpen } = useGeneratorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPassword, setLocalPassword] = useState(entry?.password ?? '');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      title: entry?.title ?? '',
      username: entry?.username ?? '',
      password: entry?.password ?? '',
      url: entry?.url ?? '',
      description: entry?.description ?? '',
      category: entry?.category ?? 'login',
      tags: entry?.tags?.join(', ') ?? '',
      icon: entry?.icon ?? '',
    },
  });

  const watchedPassword = watch('password');

  // Register password selection callback from generator
  useEffect(() => {
    setOnPasswordSelected((password) => {
      setLocalPassword(password);
      setValue('password', password, { shouldValidate: true, shouldDirty: true });
    });
    return () => setOnPasswordSelected(null);
  }, [setValue]);

  const handleOpenGenerator = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const handleIconUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setValue('icon', result);
      };
      reader.readAsDataURL(file);
    },
    [setValue]
  );

  const handleRemoveIcon = useCallback(() => {
    setValue('icon', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setValue]);

  const handleFormSubmit = handleSubmit((data) => {
    const tags = data.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      ...(entry?.id ? { id: entry.id } : {}),
      title: data.title,
      username: data.username,
      password: data.password,
      url: data.url,
      description: data.description,
      category: data.category,
      tags,
      favorite: entry?.favorite ?? false,
      icon: data.icon,
      passwordHistory: entry?.passwordHistory ?? [],
    });
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
      <h2 className="text-lg font-semibold text-text-primary">
        {entry ? 'Edit Entry' : 'New Entry'}
      </h2>

      {/* Title */}
      <div>
        <label htmlFor="entry-title" className="mb-1 block text-sm font-medium text-text-secondary">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="entry-title"
          type="text"
          {...register('title')}
          className={`input-field ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="e.g. Google Account"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          autoFocus
        />
        {errors.title && (
          <p id="title-error" className="mt-1 text-xs text-red-500" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Username */}
      <div>
        <label htmlFor="entry-username" className="mb-1 block text-sm font-medium text-text-secondary">
          Username
        </label>
        <input
          id="entry-username"
          type="text"
          {...register('username')}
          className="input-field"
          placeholder="e.g. user@example.com"
        />
      </div>

      {/* Password */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="entry-password" className="text-sm font-medium text-text-secondary">
            Password <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleOpenGenerator}
            className="flex items-center gap-1 text-xs text-accent-500 hover:text-accent-400"
            aria-label="Generate password"
          >
            <span className="material-symbols-rounded text-sm">autorenew</span>
            Generate
          </button>
        </div>
        <div className="relative">
          <PasswordInput
            value={watchedPassword}
            onChange={(val) => setValue('password', val, { shouldValidate: true, shouldDirty: true })}
            error={!!errors.password}
          />
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-red-500" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* URL */}
      <div>
        <label htmlFor="entry-url" className="mb-1 block text-sm font-medium text-text-secondary">
          URL
        </label>
        <input
          id="entry-url"
          type="url"
          {...register('url')}
          className={`input-field ${errors.url ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="e.g. https://example.com"
          aria-invalid={!!errors.url}
          aria-describedby={errors.url ? 'url-error' : undefined}
        />
        {errors.url && (
          <p id="url-error" className="mt-1 text-xs text-red-500" role="alert">
            {errors.url.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="entry-description" className="mb-1 block text-sm font-medium text-text-secondary">
          Description
        </label>
        <textarea
          id="entry-description"
          rows={3}
          {...register('description')}
          className="input-field resize-none"
          placeholder="Optional notes..."
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="entry-category" className="mb-1 block text-sm font-medium text-text-secondary">
          Category
        </label>
        <select
          id="entry-category"
          {...register('category')}
          className="input-field"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="entry-tags" className="mb-1 block text-sm font-medium text-text-secondary">
          Tags
        </label>
        <input
          id="entry-tags"
          type="text"
          {...register('tags')}
          className="input-field"
          placeholder="Comma-separated, e.g. work, important"
        />
      </div>

      {/* Icon Upload */}
      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">Icon</label>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-hover">
            {watch('icon') ? (
              <img src={watch('icon')} alt="Entry icon" className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-rounded text-text-muted">image</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleIconUpload}
            className="hidden"
            aria-label="Upload icon image"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              <span className="material-symbols-rounded text-sm mr-1">upload</span>
              Upload
            </button>
            {watch('icon') && (
              <button
                type="button"
                onClick={handleRemoveIcon}
                className="btn-secondary px-3 py-1.5 text-xs text-red-500"
              >
                <span className="material-symbols-rounded text-sm mr-1">delete</span>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary">
          <span className="material-symbols-rounded mr-1 text-sm">
            {entry ? 'save' : 'add'}
          </span>
          {entry ? 'Save Changes' : 'Create Entry'}
        </button>
      </div>
    </form>
  );
}

function PasswordInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
}): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input-field pr-10 ${error ? 'border-red-500' : ''}`}
        placeholder="Enter password"
        aria-label="Password"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn"
        aria-label={isVisible ? 'Hide password' : 'Show password'}
      >
        <span className="material-symbols-rounded text-sm">
          {isVisible ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  );
}
