export interface ColorTheme {
  text: string;
  background: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  primary: string;
}
export interface CommonColors {
  primary: string;
  lime: string;
  pink: string;
  brown: string;
  sky: string;
  teal: string;
  yellow: string;
  orange: string;
  red: string;
  blue: string;
  green: string;
  grey: string;
  greyLight: string;
  input: string;
  selected: string;
}

export interface AppTheme {
  light: ColorTheme;
  dark: ColorTheme;
  common: CommonColors;
}

const tintColorLight = "#2f95dc";
const tintColorDark = "#fff";

const theme: AppTheme = {
  light: {
    text: "#000",
    background: "#fff",
    tint: tintColorLight,
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorLight,
    primary: "#51b0cb",
  },
  dark: {
    text: "#fff",
    background: "#000",
    tint: tintColorDark,
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorDark,
    primary: "#51b0cb",
  },
  common: {
    primary: "#51b0cb",
    lime: "#D7FFD4",
    pink: "#F655FF",
    brown: "#29271D",
    sky: "#E5EDFF",
    teal: "#0E4D45",
    yellow: "#FCBB80",
    orange: "#EF580B",
    red: "red",
    blue: "#0000FA",
    green: "#172E15",
    grey: "#242026",
    greyLight: "#B8B3BA",
    input: "#EEE9F0",
    selected: "#e5f3f7",
  },
};

export default theme;
