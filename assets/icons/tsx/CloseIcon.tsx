import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
const CloseIcon = (props: SvgProps) => (
    <Svg
        width={20}
        height={20}
        fill="none"
        viewBox="0 0 24 24"
        {...props}
    >
        <Path
            stroke="#000"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="m18 18-6-6m0 0L6 6m6 6 6-6m-6 6-6 6"
        />
    </Svg>
)
export default CloseIcon
