
const colorStyles = [
    { background: "#4589ff", color: "white" }, // blue
    { background: "#198038", color: "white" }, // green
    { background: "#a2191f", color: "white" }, // red
    { background: "#d2a106", color: "white" }, // yellow
    { background: "#8a3ffc", color: "white" }, // violet
];

let index = 0;
const styleMap: { [key: string]: { background: string, color: string } } = {}

export function pickButtonStyle(name: string): { background: string, color: string } {
    let style = styleMap[name];
    if (style === undefined) {
        style = colorStyles[index];
        styleMap[name] = style;
        ++index;
        if (index === colorStyles.length) index = 0;
    }
    return style;
}