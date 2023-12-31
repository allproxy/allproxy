import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from '@material-ui/core';
import { themeStore } from '../store/ThemeStore';

let once = false;

declare global {
	interface Window {
		darkMode: any;
	}
}

type Props = {
	open: boolean,
	onClose: (theme: string) => void,
};
const DarkModeDialog = observer(({ open, onClose }: Props) => {
	const [theme, setTheme] = React.useState('system');
	const t = localStorage.getItem('allproxy-theme');
	if (!once && t) {
		setTheme(t);
		once = true;
	}

	const handleClose = () => {
		localStorage.setItem('allproxy-theme', theme);
		onClose(theme);
	};

	function handleDark() {
		if (theme === 'light' || themeStore.getTheme() === 'light') {
			window.darkMode.toggle();
			themeStore.setTheme('dark');
		}
		setTheme('dark');
	}
	function handleLight() {
		if (theme === 'dark' || themeStore.getTheme() === 'dark') {
			window.darkMode.toggle();
			themeStore.setTheme('light');
		}
		setTheme('light');
	}
	function handleSystem() {
		window.darkMode.system();
		setTheme('system');
	}

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
			<FormControl style={{ padding: '1rem' }}>
				<FormLabel id="theme-radio-button">Appearance</FormLabel>
				<RadioGroup
					aria-labelledby="theme-radio-button"
					defaultValue={theme}
					name="radio-buttons-group"
				>
					<FormControlLabel value="dark" control={<Radio />} label="Dark" onClick={handleDark} />
					<FormControlLabel value="light" control={<Radio />} label="Light" onClick={handleLight} />
					<FormControlLabel value="system" control={<Radio />} label="System" onClick={handleSystem} />
				</RadioGroup>
			</FormControl>
			<button className={'btn btn-success'}
				onClick={handleClose}
			>
				Ok
			</button>
		</Dialog>
	);
});

export default DarkModeDialog;