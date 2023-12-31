import { observer } from "mobx-react-lite";
import { PropsWithChildren } from "react";

type Props = {
	show: boolean
};
const StatusBox = observer((props: PropsWithChildren<Props>) => {
	return (
		<div hidden={!props.show}
			style={{
				display: 'inline-block',
				position: 'absolute',
				zIndex: 999999,
				top: '8rem',
				left: '50%',
				background: 'rgb(0, 123, 255)',
				color: 'white',
				marginTop: '1rem',
				padding: '1rem',
			}}>
			{props.children}
		</div >
	);
});

export default StatusBox;