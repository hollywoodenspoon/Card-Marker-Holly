import { jsx as _jsx } from "react/jsx-runtime";
import { usePasteImages } from '@/ui/actions/usePaste';
import { useShortcuts } from '@/ui/actions/useShortcuts';
import { DesktopShell } from './DesktopShell';
import { PhoneShell } from './PhoneShell';
import { TabletShell } from './TabletShell';
import { useLayout } from './useLayout';
export function AppShell() {
    const layout = useLayout();
    useShortcuts();
    usePasteImages();
    if (layout === 'phone')
        return _jsx(PhoneShell, {});
    if (layout === 'tablet')
        return _jsx(TabletShell, {});
    return _jsx(DesktopShell, {});
}
