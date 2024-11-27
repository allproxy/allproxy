import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from '@material-ui/core';
import { themeStore } from '../store/ThemeStore';
import GTag from '../GTag';

let once = false;
let saveDarkMode: 'dark' | 'light' | 'system' = 'system';

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
	const [darkMode, setDarkMode] = React.useState<'light' | 'dark' | 'system'>('system');
	const t = localStorage.getItem('allproxy-theme');
	if (!once && t) {
		setDarkMode(t as 'dark' | 'light' | 'system');
		saveDarkMode = t as 'dark' | 'light' | 'system';
		fixCssPrefersColorScheme();
		// if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		// 	if (t === 'light') {
		// 		switch_theme_rules();
		// 	}
		// }
		once = true;
	}

	const handleClose = () => {
		localStorage.setItem('allproxy-theme', darkMode);
		onClose(darkMode);
		GTag.pageView('DarkModeDialog ' + darkMode);
	};

	function handleDark() {
		if (darkMode === 'light' || themeStore.getTheme() === 'light') {
			if (window.darkMode) window.darkMode.toggle();
		}
		themeStore.setTheme('dark');
		setDarkMode('dark');
		saveDarkMode = 'dark';
		fixCssPrefersColorScheme();
	}
	function handleLight() {
		if (darkMode === 'dark' || themeStore.getTheme() === 'dark') {
			if (window.darkMode) window.darkMode.toggle();
		}
		themeStore.setTheme('light');
		setDarkMode('light');
		saveDarkMode = 'light';
		fixCssPrefersColorScheme();
	}
	function handleSystem() {
		if (window.darkMode) window.darkMode.system();
		setDarkMode('system');
		saveDarkMode = 'system';
		fixCssPrefersColorScheme();
	}

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
			<FormControl style={{ padding: '1rem' }}>
				<FormLabel id="theme-radio-button">Appearance</FormLabel>
				<RadioGroup
					aria-labelledby="theme-radio-button"
					defaultValue={darkMode}
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

let cssModified = false;

export function fixCssPrefersColorScheme() {
	if (window.darkMode) return;
	const isPrefersColorSchemeDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	switch (saveDarkMode) {
		case 'dark':
			if (isPrefersColorSchemeDark === cssModified) {
				switchCssPrefersColorScheme();
			}
			break;
		case 'light':
			if (isPrefersColorSchemeDark !== cssModified) {
				switchCssPrefersColorScheme();
			}
			break;
		case 'system':
			if (cssModified) {
				switchCssPrefersColorScheme();
			}
			break;
	};
}

function switchCssPrefersColorScheme() {
	/*
		Function for switching the rules for perfers-color-scheme
		Goes through each style sheet file, then each rule within each stylesheet
		and looks for any rules that require a prefered colorscheme, 
		if it finds one that requires light theme then it makes it require dark theme / vise
		versa. The idea is that it will feel as though the themes switched even if they haven't. 
	*/
	for (var sheet_file = 0; sheet_file < document.styleSheets.length; sheet_file++) {
		try {
			for (var sheet_rule = 0; sheet_rule < document.styleSheets[sheet_file].cssRules.length; sheet_rule++) {
				let rule: any = document.styleSheets[sheet_file].cssRules[sheet_rule];

				if (rule && rule.media && rule.media.mediaText.includes("prefers-color-scheme")) {
					let rule_media: any = rule.media.mediaText;
					let new_rule_media;
					if (rule_media.includes("light")) {
						new_rule_media = rule_media.replace("light", "dark");
					}
					if (rule_media.includes("dark")) {
						new_rule_media = rule_media.replace("dark", "light");
					}
					if (new_rule_media) {
						rule.media.deleteMedium(rule_media);
						rule.media.appendMedium(new_rule_media);
					}
				}
			}
		}
		catch (e) {
			const broken_sheet = document.styleSheets[sheet_file].href;
			console.warn(broken_sheet + " broke something with theme toggle : " + e);
		}
	}
	cssModified = !cssModified;
}

export default DarkModeDialog;