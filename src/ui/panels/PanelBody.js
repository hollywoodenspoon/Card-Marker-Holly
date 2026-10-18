import { jsx as _jsx } from "react/jsx-runtime";
import { AssetsPanel } from './AssetsPanel';
import { CardsPanel } from './CardsPanel';
import { FontsPanel } from './FontsPanel';
import { LayersPanel } from './LayersPanel';
import { TemplatesPanel } from './TemplatesPanel';
export function PanelBody({ id, onPicked }) {
    switch (id) {
        case 'cards':
            return _jsx(CardsPanel, { onPicked: onPicked });
        case 'assets':
            return _jsx(AssetsPanel, { onPicked: onPicked });
        case 'fonts':
            return _jsx(FontsPanel, {});
        case 'templates':
            return _jsx(TemplatesPanel, { onPicked: onPicked });
        case 'layers':
            return _jsx(LayersPanel, {});
    }
}
