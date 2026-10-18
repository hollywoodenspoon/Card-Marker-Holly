import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Monitor, Moon, Sun } from 'lucide-react';
import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, } from '@/ui/components/ui/dropdown';
import { setTheme, useThemeSetting } from './theme';
/** Theme radio items, meant to live inside an existing dropdown menu. */
export function ThemeMenuItems() {
    const theme = useThemeSetting();
    return (_jsxs(_Fragment, { children: [_jsx(DropdownMenuLabel, { children: "Theme" }), _jsxs(DropdownMenuRadioGroup, { value: theme, onValueChange: (v) => setTheme(v), children: [_jsxs(DropdownMenuRadioItem, { value: "light", children: [_jsx(Sun, {}), " Light"] }), _jsxs(DropdownMenuRadioItem, { value: "dark", children: [_jsx(Moon, {}), " Dark"] }), _jsxs(DropdownMenuRadioItem, { value: "system", children: [_jsx(Monitor, {}), " Follow system"] })] })] }));
}
