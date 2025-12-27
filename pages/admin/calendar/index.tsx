/**
 * Admin - Manage Calendar Events
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useFormik } from 'formik';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, {
	CardActions,
	CardBody,
	CardHeader,
	CardLabel,
	CardTitle,
} from '../../../components/bootstrap/Card';
import Modal, {
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Select from '../../../components/bootstrap/forms/Select';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import { Calendar, dayjsLocalizer, View as TView, Views } from 'react-big-calendar';
import dayjs from 'dayjs';
import showNotification from '../../../components/extras/showNotification';
import {
	CalendarTodayButton,
	CalendarViewModeButtons,
	getLabel,
	getUnitType,
	getViews,
} from '../../../components/extras/calendarHelper';

interface CalendarEvent {
	id: string;
	title: string;
	description: string | null;
	event_date: string;
	event_type: string | null;
	created_at: string;
	academic_year: {
		name: string;
	};
}

interface AcademicYear {
	id: string;
	name: string;
	is_current: boolean;
}

const localizer = dayjsLocalizer(dayjs);

const AdminCalendarPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();

	// Calendar State
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [mappedEvents, setMappedEvents] = useState<any[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
	const [viewMode, setViewMode] = useState<TView>(Views.MONTH);
	const [date, setDate] = useState(new Date());

	const [modalOpen, setModalOpen] = useState(false);
	const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

	// Helpers for Calendar Navigation
	const unitType = getUnitType(viewMode);
	const calendarDateLabel = getLabel(date, viewMode);
	const views = getViews();

	// Check if user has edit permissions (Only Super Admin)
	const canEdit = role === UserRole.SUPER_ADMIN;

	// Protect route - Allow Admin, Teacher, and Parent
	useEffect(() => {
		if (
			!loading &&
			(!user ||
				(role !== UserRole.SUPER_ADMIN &&
					role !== UserRole.TEACHER &&
					role !== UserRole.PARENT))
		) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch academic years
	useEffect(() => {
		const fetchAcademicYears = async () => {
			try {
				const { data, error } = await supabase
					.from('academic_years')
					.select('id, name, is_current')
					.order('start_date', { ascending: false });

				if (error) throw error;
				setAcademicYears(data || []);
			} catch (error) {
				console.error('Error fetching academic years:', error);
			}
		};
		if (user) fetchAcademicYears();
	}, [user]);

	// Fetch calendar events
	const fetchEvents = async () => {
		try {
			const { data, error } = await supabase
				.from('calendar_events')
				.select(
					`
					id,
					title,
					description,
					event_date,
					event_type,
					created_at,
					academic_year:academic_years(name),
					academic_year_id
				`,
				)
				.order('event_date', { ascending: true });

			if (error) throw error;
			setEvents(data || []);
		} catch (error) {
			console.error('Error fetching events:', error);
			showNotification('Error', 'Failed to load calendar events', 'danger');
		}
	};

	useEffect(() => {
		if (user) fetchEvents();
	}, [user]);

	// Map DB events to Calendar events
	useEffect(() => {
		const mapped = events.map((event) => ({
			...event,
			start: new Date(event.event_date),
			end: new Date(event.event_date),
			allDay: true,
			title: event.title,
		}));
		setMappedEvents(mapped);
	}, [events]);

	const formik = useFormik({
		initialValues: {
			academic_year_id: '',
			title: '',
			description: '',
			event_date: '',
			event_type: '',
		},
		onSubmit: async (values) => {
			if (!canEdit) return; // Prevent submission if not allowed

			try {
				const payload = {
					...values,
					created_by: user?.id,
				};

				if (editingEvent) {
					const { error } = await supabase
						.from('calendar_events')
						.update(payload)
						.eq('id', editingEvent.id);
					if (error) throw error;
					showNotification('Success', 'Event updated successfully', 'success');
				} else {
					const { error } = await supabase.from('calendar_events').insert([payload]);
					if (error) throw error;
					showNotification('Success', 'Event created successfully', 'success');
				}
				setModalOpen(false);
				formik.resetForm();
				setEditingEvent(null);
				fetchEvents();
			} catch (error: any) {
				showNotification('Error', error.message, 'danger');
			}
		},
	});

	const handleEdit = (event: CalendarEvent) => {
		setEditingEvent(event);
		formik.setValues({
			academic_year_id: (event as any).academic_year_id || '',
			title: event.title,
			description: event.description || '',
			event_date: event.event_date,
			event_type: event.event_type || '',
		});
		setModalOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (!canEdit) return;
		if (!confirm('Are you sure you want to delete this event?')) return;
		try {
			const { error } = await supabase.from('calendar_events').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Event deleted successfully', 'success');
			setModalOpen(false);
			setEditingEvent(null);
			fetchEvents();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	// Get color based on event type
	const getEventTypeColor = (type: string | null) => {
		switch (type) {
			case 'holiday':
				return 'danger';
			case 'exam':
				return 'warning';
			case 'event':
				return 'info';
			case 'meeting':
				return 'primary';
			default:
				return 'secondary';
		}
	};

	const eventStyleGetter = (event: any) => {
		const color = getEventTypeColor(event.event_type);
		return {
			className: `bg-l10-${color} text-${color} border border-${color}`,
			style: {
				borderLeft: '4px solid',
			},
		};
	};

	const onSelectSlot = ({ start }: { start: Date }) => {
		if (!canEdit) return; // Disable slot selection for non-admins
		setEditingEvent(null);
		formik.resetForm();
		// Set the date from the clicked slot
		formik.setFieldValue('event_date', dayjs(start).format('YYYY-MM-DD'));
		setModalOpen(true);
	};

	const onSelectEvent = (event: any) => {
		// Allow viewing details but in read-only mode for non-admins
		handleEdit(event);
	};

	const handleViewMode = (e: any) => {
		setDate(dayjs(e).toDate());
		setViewMode(Views.DAY);
	};

	if (
		loading ||
		!user ||
		(role !== UserRole.SUPER_ADMIN && role !== UserRole.TEACHER && role !== UserRole.PARENT)
	)
		return null;

	const dashboardPath =
		role === UserRole.TEACHER
			? '/teacher/dashboard'
			: role === UserRole.PARENT
				? '/parent/dashboard'
				: '/admin/dashboard';

	return (
		<PageWrapper>
			<Head>
				<title>Manage Calendar Events - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button
						color='info'
						isLink
						icon='ArrowBack'
						onClick={() => router.push(dashboardPath)}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>
						{canEdit ? 'Manage Calendar Events' : 'School Calendar'}
					</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					{canEdit && (
						<Button
							color='primary'
							icon='Add'
							onClick={() => {
								setEditingEvent(null);
								formik.resetForm();
								formik.setFieldValue(
									'event_date',
									dayjs(date).format('YYYY-MM-DD'),
								);
								setModalOpen(true);
							}}>
							Add Event
						</Button>
					)}
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card stretch>
							<CardHeader>
								<CardLabel icon='Event'>
									<CardTitle>{calendarDateLabel}</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								<div style={{ height: '600px' }}>
									<Calendar
										selectable={canEdit}
										localizer={localizer}
										events={mappedEvents}
										defaultView={Views.MONTH}
										views={views}
										view={viewMode}
										date={date}
										onNavigate={(newDate) => setDate(newDate)}
										onView={(newView) => setViewMode(newView)}
										onSelectSlot={onSelectSlot}
										onSelectEvent={onSelectEvent}
										onDrillDown={handleViewMode}
										eventPropGetter={eventStyleGetter}
									/>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			{/* Add/Edit Modal */}
			<Modal isOpen={modalOpen} setIsOpen={setModalOpen} size='lg' titleId='event-modal'>
				<ModalHeader setIsOpen={setModalOpen}>
					<ModalTitle id='event-modal'>
						{editingEvent ? (canEdit ? 'Edit Event' : 'Event Details') : 'Add Event'}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<form onSubmit={formik.handleSubmit}>
						<FormGroup id='academic_year_id' label='Academic Year' className='mb-3'>
							<Select
								onChange={formik.handleChange}
								value={formik.values.academic_year_id}
								ariaLabel='Academic Year'
								required
								disabled={!canEdit}>
								<option value=''>Select Academic Year</option>
								{academicYears.map((year) => (
									<option key={year.id} value={year.id}>
										{year.name} {year.is_current && '(Current)'}
									</option>
								))}
							</Select>
						</FormGroup>
						<FormGroup id='title' label='Event Title' className='mb-3'>
							<Input
								onChange={formik.handleChange}
								value={formik.values.title}
								placeholder='Event title'
								required
								disabled={!canEdit}
							/>
						</FormGroup>
						<FormGroup id='event_date' label='Event Date' className='mb-3'>
							<Input
								type='date'
								onChange={formik.handleChange}
								value={formik.values.event_date}
								required
								disabled={!canEdit}
							/>
						</FormGroup>
						<FormGroup id='event_type' label='Event Type' className='mb-3'>
							<Select
								onChange={formik.handleChange}
								value={formik.values.event_type}
								ariaLabel='Event Type'
								disabled={!canEdit}>
								<option value=''>Select Type</option>
								<option value='holiday'>Holiday</option>
								<option value='exam'>Exam</option>
								<option value='event'>Event</option>
								<option value='meeting'>Meeting</option>
								<option value='other'>Other</option>
							</Select>
						</FormGroup>
						<FormGroup id='description' label='Description' className='mb-3'>
							<Textarea
								onChange={formik.handleChange}
								value={formik.values.description}
								placeholder='Event description'
								rows={3}
								disabled={!canEdit}
							/>
						</FormGroup>
					</form>
				</ModalBody>
				<ModalFooter>
					{canEdit && editingEvent && (
						<Button
							color='danger'
							icon='Delete'
							onClick={() => handleDelete(editingEvent.id)}
							className='me-auto'>
							Delete
						</Button>
					)}
					<Button color='secondary' isOutline onClick={() => setModalOpen(false)}>
						{canEdit ? 'Cancel' : 'Close'}
					</Button>
					{canEdit && (
						<Button color='primary' onClick={() => formik.handleSubmit()}>
							{editingEvent ? 'Update' : 'Create'}
						</Button>
					)}
				</ModalFooter>
			</Modal>
		</PageWrapper>
	);
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default AdminCalendarPage;
