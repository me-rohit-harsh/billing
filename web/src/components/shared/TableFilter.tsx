'use client';

import React from 'react';
import { Search, LayoutGrid, List, Download } from 'lucide-react';
import { CustomDropdown } from '@/components/shared/CustomDropdown';

interface TableFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories?: { _id: string; name: string }[];
  selectedCategory?: string | string[];
  onCategorySelect?: (catId: any) => void;
  placeholder?: string;
  viewMode?: 'table' | 'grid';
  onViewModeChange?: (mode: 'table' | 'grid') => void;
  onExport?: () => void;
  exportLabel?: string;
  multiSelect?: boolean;
}

export function TableFilter({
  searchQuery,
  onSearchChange,
  categories = [],
  selectedCategory = [],
  onCategorySelect,
  placeholder = 'Search...',
  viewMode,
  onViewModeChange,
  onExport,
  exportLabel = 'Export CSV',
  multiSelect = true,
}: TableFilterProps) {
  const dropdownOptions = categories.map((cat) => ({
    _id: cat._id || cat.name,
    name: cat.name,
  }));

  const selectedValues = Array.isArray(selectedCategory)
    ? selectedCategory
    : selectedCategory
    ? [selectedCategory]
    : [];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-4">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
        />
      </div>

      <div className="flex items-center gap-3 justify-between sm:justify-end">
        {categories.length > 0 && onCategorySelect && (
          <div className="w-full sm:w-60 min-w-[180px]">
            {multiSelect ? (
              <CustomDropdown
                compact
                multi={true}
                placeholder="All Categories"
                options={dropdownOptions}
                value={selectedValues}
                onChange={(val: string[]) => onCategorySelect(val)}
                searchable={categories.length > 4}
                clearable
              />
            ) : (
              <CustomDropdown
                compact
                multi={false}
                placeholder="All Categories"
                options={[{ _id: '', name: 'All Categories' }, ...dropdownOptions]}
                value={typeof selectedCategory === 'string' ? selectedCategory : ''}
                onChange={(val: string) => onCategorySelect(val)}
                searchable={categories.length > 4}
                clearable
              />
            )}
          </div>
        )}

        {viewMode && onViewModeChange && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Cards</span>
            </button>
          </div>
        )}

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{exportLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
