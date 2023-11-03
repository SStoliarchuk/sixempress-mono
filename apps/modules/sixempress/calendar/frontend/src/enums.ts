export const Attribute = {
	viewCalendarEvents: 32000,
	addCalendarEvents: 32001,
	modifyCalendarEvents: 32002,
	deleteCalendarEvents: 32003,

	viewCustomerAppointment: 30000,
	addCustomerAppointment: 30001,
	modifyCustomerAppointment: 30002,
	deleteCustomerAppointment: 30003,
}
export const AttributeLabel = {
	[Attribute.viewCalendarEvents]: "Visualizzare Eventi Calendario",
	[Attribute.addCalendarEvents]: "Aggiungere Eventi Calendario",
	[Attribute.modifyCalendarEvents]: "Modificare Eventi Calendario",
	[Attribute.deleteCalendarEvents]: "Eliminare Eventi Calendario",

	[Attribute.viewCustomerAppointment]: "Visualizzare Trattamenti Cliente",
	[Attribute.addCustomerAppointment]: "Aggiungere Trattamenti Cliente",
	[Attribute.modifyCustomerAppointment]: "Modificare Trattamenti Cliente",
	[Attribute.deleteCustomerAppointment]: "Eliminare Trattamenti Cliente",

}

export enum ModelClass {
	CalendarEvent             = 'CalendarEventModel',
	CustomerAppointment         = 'CustomerAppointmentModel',
}
export enum ModelClassLabel {
	'EventoCalendario'           = ModelClass.CalendarEvent,
	'Appuntamento Cliente'        = ModelClass.CustomerAppointment,
}

export enum BePaths {
	calendarevents                = 'calendarevents/',
	CustomerAppointment            = 'customerappointments/',
}

export enum CalendarCacheKeys {
	calendarView = 'sxcalendar__calendar_view',
	calendarSteps = "sxcalendar__calendar_steps",
	calendarStepsFrom = "sxcalendar__calendar_stepsFrom",
	calendarStepsTo = "sxcalendar__calendar_stepsTo",
	calendarCreateEventType = 'sxcalendar__create_event_modeclass',
	// cceHairdresserTemplates = 'sxcalendar__cce-hairdresser-templates',
	// cceHairdresserAutomaticSale = 'sxcalendar__cce-hair-automatic-sale',
	// cceHairdresserDeleteDeleteSaleToo = 'sxcalendar__cce-hair-delete-delete-sale-too',
}