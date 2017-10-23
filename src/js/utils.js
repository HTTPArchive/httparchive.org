export const el = tagName => document.createElement(tagName);

export const prettyDate = YYYY_MM_DD => {
	const [YYYY, MM, DD] = YYYY_MM_DD.split('_');
	const d = new Date(Date.UTC(YYYY, MM - 1, DD));
	return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'});
};

export const chartExportOptions2 = {
        menuItemDefinitions: {
            // Custom definition
            label: {
                onclick: function () {
                    this.renderer.label(
                        'You just clicked a custom menu item',
                        100,
                        100
                    )
                    .attr({
                        fill: '#a4edba',
                        r: 5,
                        padding: 10,
                        zIndex: 10
                    })
                    .css({
                        fontSize: '1.5em'
                    })
                    .add();
                },
                text: 'Show label'
            }
        },
        buttons: {
            contextButton: {
                menuItems: ['downloadPNG', 'downloadSVG', 'separator', 'label']
            }
        }
    };

export const chartExportOptions = {
	menuItemDefinitions: {
		showQuery: {
			onclick: function() {
				const {metric, type} = this.options;
				console.log('Show query for', metric, type);
			},
			text: 'Show Query'
		}
	},
	buttons: {
		contextButton: {
			menuItems: ['showQuery', 'downloadPNG']
		}
	}
};
