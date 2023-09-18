import { themeStore } from "./store/ThemeStore";

const colorStyles = [
    { background: "#4589ff", color: "white" }, // blue
    { background: "#198038", color: "white" }, // green
    { background: "#a2191f", color: "white" }, // red
    { background: "#d2a106", color: "black" }, // yellow
    { background: "#8a3ffc", color: "white" }, // violet

    { background: '#f58231', color: "white" },
    { background: '#42d4f4', color: "black" },
    { background: '#911eb4', color: "white" },
    { background: '#f032e6', color: "white" },
    { background: '#a9a9a9', color: "black" },

    { background: '#ff0000', color: "white" }, // dark red
    { background: '#9A6324', color: "white" },
    { background: '#808000', color: "white" },
    { background: '#469990', color: "white" },
    { background: '#1f45fc', color: "white" }, // dark blue
    //{ background: '#000000', color: "white" },

    { background: '#fabed4', color: "black" },
    { background: '#ffd8b1', color: "black" },
    { background: '#fffac8', color: "black" },
    { background: '#aaffc3', color: "black" },
    { background: '#dcbeff', color: "black" },

    { background: '#bfef45', color: "black" },
];

let labelIndex = 0;
let categoryIndex = 0;
const styleMap: { [key: string]: { background: string, color: string, lightColor: string, filter: string } } = {};

export function pickCategoryStyle(name: string): { background: string, color: string, filter: string } {
    return pickStyle(name, 'category');
}

export function pickLabelStyle(name: string): { background: string, color: string, filter: string } {
    return pickStyle(name, 'label');
}

function pickStyle(name: string, type: 'category' | 'label'): { background: string, color: string, filter: string } {
    let style = styleMap[name];
    if (style === undefined) {
        //console.log(index, name)
        style = { background: '', color: '', lightColor: '', filter: '' };
        let index = type === 'category' ? categoryIndex : labelIndex;
        const s = colorStyles[index];
        style.background = s.background;
        style.lightColor = s.color;
        styleMap[name] = style;
        ++index;
        if (index === colorStyles.length) index = 0;
        if (type === 'category') {
            categoryIndex = index;
        } else {
            labelIndex = index;
        }
    }
    if (themeStore.getTheme() === 'dark') {
        style.color = style.lightColor;
        style.filter = 'grayscale(60%)';
    } else {
        style.color = style.lightColor;
    }

    return style;
}