import { observer } from "mobx-react-lite";
import { PropsWithChildren } from "react";

type Props = {
	show: boolean
};
const StatusBox = observer((props: PropsWithChildren<Props>) => {
	return (
		<div hidden={!props.show}
			style={{
				fontFamily: 'monospace',
				display: 'inline-block',
				position: 'absolute',
				zIndex: 999999,
				top: '8rem',
				left: 'calc(50% - 300px)',
				width: '600px',
				background: 'rgb(0, 123, 255)',
				color: 'white',
				marginTop: '1rem',
				padding: '1rem',
				wordBreak: 'break-all',
			}}>
			{props.children}
		</div >
	);
});

export default StatusBox;