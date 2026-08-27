'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X, Loader2 } from 'lucide-react';

interface Option {
    _id: string;
    name: string;
    description?: string;
}

interface BaseProps {
    label?: string;
    options: Option[];
    placeholder?: string;
    error?: string;
    required?: boolean;
    compact?: boolean;
    searchable?: boolean;
    clearable?: boolean;
    loading?: boolean;
    disabled?: boolean;
    minSearchItems?: number;
    height?: string;
    borderRadius?: string;
    className?: string;
}

interface SingleProps extends BaseProps {
    multi?: false;
    value: string;
    onChange: (value: string) => void;
}

interface MultiProps extends BaseProps {
    multi: true;
    value: string[];
    onChange: (value: string[]) => void;
}

type CustomDropdownProps = SingleProps | MultiProps;

export function CustomDropdown(props: CustomDropdownProps) {
    const effectiveBorderRadius = props.borderRadius ?? '12px';

    const {
        label,
        options = [],
        value,
        onChange,
        placeholder = 'Select option',
        error,
        required = false,
        compact = false,
        searchable,
        loading = false,
        disabled = false,
        multi = false,
        minSearchItems = 6,
        height,
        className = ""
    } = props;

    const [isOpen, setIsOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
    const [renderTop, setRenderTop] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const isSearchReallyActive = searchable ?? options.length >= minSearchItems;

    const selectedOptions = useMemo(() => {
        if (multi) {
            return options.filter(opt => (value as string[]).includes(opt._id));
        }
        return options.find(opt => opt._id === (value as string));
    }, [options, value, multi]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const term = searchTerm.toLowerCase();
        return options.filter(opt =>
            (opt.name ? String(opt.name).toLowerCase() : '').includes(term) ||
            (opt.description ? String(opt.description).toLowerCase() : '').includes(term)
        );
    }, [options, searchTerm]);

    const updateDropdownRect = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownRect(rect);
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = Math.min(280, options.length * 44 + (isSearchReallyActive ? 40 : 0) + 16);
            if (spaceBelow < Math.min(200, menuHeight) && rect.top > spaceBelow) {
                setRenderTop(true);
            } else {
                setRenderTop(false);
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateDropdownRect();
            window.addEventListener('scroll', updateDropdownRect, true);
            window.addEventListener('resize', updateDropdownRect);
        }
        return () => {
            window.removeEventListener('scroll', updateDropdownRect, true);
            window.removeEventListener('resize', updateDropdownRect);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (containerRef.current && containerRef.current.contains(target)) return;
            if (menuRef.current && menuRef.current.contains(target)) return;
            setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        setIsClient(true);
        if (isOpen) {
            setFocusedIndex(-1);
            if (isSearchReallyActive) {
                const timer = setTimeout(() => {
                    searchInputRef.current?.focus();
                }, 50);
                return () => clearTimeout(timer);
            }
        } else {
            setSearchTerm('');
        }
    }, [isOpen, isSearchReallyActive]);

    const handleSelect = (optionId: string) => {
        if (multi) {
            const currentValues = (value as string[]);
            const newValues = currentValues.includes(optionId)
                ? currentValues.filter(id => id !== optionId)
                : [...currentValues, optionId];
            (onChange as (val: string[]) => void)(newValues);
        } else {
            (onChange as (val: string) => void)(optionId);
            setIsOpen(false);
        }
    };

    const DropdownMenu = (
        <AnimatePresence>
            {isOpen && dropdownRect && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95, y: renderTop ? 10 : -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: renderTop ? 10 : -10 }}
                    transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                    style={{
                        position: 'fixed',
                        top: renderTop ? undefined : dropdownRect.bottom + 6,
                        bottom: renderTop ? window.innerHeight - dropdownRect.top + 6 : undefined,
                        left: dropdownRect.left,
                        width: dropdownRect.width,
                        zIndex: 99999,
                        background: 'rgba(255, 255, 255, 0.98)',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                        borderRadius: effectiveBorderRadius,
                        backdropFilter: 'blur(25px)',
                    }}
                >
                    {isSearchReallyActive && (
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.9)' }}>
                            <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}
                            />
                        </div>
                    )}
                    <div ref={optionsRef} style={{ padding: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: '20px 16px', color: '#94a3b8', textAlign: 'center', fontSize: '13px' }}>No options found</div>
                        ) : (
                            filteredOptions.map((option, index) => {
                                const isSelected = multi
                                    ? (Array.isArray(value) && value.includes(option._id))
                                    : (value === option._id);
                                return (
                                    <div
                                        key={option._id}
                                        onClick={() => handleSelect(option._id)}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            background: isSelected ? '#eff6ff' : 'transparent',
                                            color: isSelected ? '#2563eb' : '#1e293b',
                                            fontWeight: isSelected ? '700' : '500',
                                            fontSize: '13.5px',
                                        }}
                                    >
                                        <div>{option.name}</div>
                                        {isSelected && <Check size={16} style={{ color: '#2563eb' }} />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div ref={containerRef} className={`custom-dropdown-container ${className}`} style={{ position: 'relative', width: '100%' }}>
            {label && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? '6px' : '8px' }}>
                    <label style={{ fontWeight: '700', color: '#262626', fontSize: compact ? '11px' : '14px' }}>
                        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                </div>
            )}
            <div
                ref={triggerRef}
                onClick={() => !disabled && !loading && setIsOpen(prev => !prev)}
                style={{
                    borderRadius: effectiveBorderRadius,
                    width: '100%',
                    padding: compact ? '0 10px' : '0 16px',
                    border: error ? '2px solid #ef4444' : isOpen ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: height || (compact ? '32px' : '44px'),
                    background: '#fafafa',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                }}
            >
                <span style={{ fontSize: compact ? '12px' : '14px', color: selectedOptions ? '#171717' : '#a3a3a3', fontWeight: '500' }}>
                    {selectedOptions && !Array.isArray(selectedOptions) ? (selectedOptions as Option).name : placeholder}
                </span>
                <ChevronDown size={compact ? 14 : 18} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none' }} />
            </div>
            {isClient && createPortal(DropdownMenu, document.body)}
        </div>
    );
}
