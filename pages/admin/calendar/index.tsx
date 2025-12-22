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
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Select from '../../../components/bootstrap/forms/Select';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

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

const AdminCalendarPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
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
				.select(`
					id,
					title,
					description,
					event_date,
					event_type,
					created_at,
					academic_year:academic_years(name)
				`)
				.order('event_date', { ascending: true });

			if (error) throw error;
			setEvents(data || []);
		} catch (error) {
			console.error('Error fetching events:', error);
			showNotification('Error', 'Failed to load calendar events', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchEvents();
	}, [user]);

	const formik = useFormik({
		initialValues: {
			academic_year_id: '',
			title: '',
			description: '',
			event_date: '',
			event_type: '',
		},
		onSubmit: async (values) => {
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
		if (!confirm('Are you sure you want to delete this event?')) return;
		try {
			const { error } = await supabase.from('calendar_events').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Event deleted successfully', 'success');
			fetchEvents();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

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

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Manage Calendar Events - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Manage Calendar Events</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='primary'
						icon='Add'
						onClick={() => {
							setEditingEvent(null);
							formik.resetForm();
							setModalOpen(true);
						}}>
						Add Event
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='Event'>
									<CardTitle>Calendar Events</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : events.length === 0 ? (
									<div className='text-center py-5 text-muted'>No events found</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Date</th>
												<th>Title</th>
												<th>Type</th>
												<th>Description</th>
												<th>Academic Year</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{events.map((event) => (
												<tr key={event.id}>
													<td>
														<div className='fw-bold'>
															{new Date(event.event_date).toLocaleDateString('en-US', {
																weekday: 'short',
																year: 'numeric',
																month: 'short',
																day: 'numeric',
															})}
														</div>
													</td>
													<td>
														<div className='fw-bold'>{event.title}</div>
													</td>
													<td>
														{event.event_type && (
															<span className={`badge bg-${getEventTypeColor(event.event_type)}`}>
																{event.event_type}
															</span>
														)}
													</td>
													<td>
														<div style={{ maxWidth: '300px' }} className='text-truncate'>
															{event.description || '-'}
														</div>
													</td>
													<td>{event.academic_year?.name || 'N/A'}</td>
													<td className='text-end'>
														<Button
															icon='Edit'
															color='info'
															isLight
															size='sm'
															className='me-2'
															onClick={() => handleEdit(event)}>
															Edit
														</Button>
														<Button
															icon='Delete'
															color='danger'
															isLight
															size='sm'
															onClick={() => handleDelete(event.id)}>
															Delete
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>

			{/* Add/Edit Modal */}
			<Modal isOpen={modalOpen} setIsOpen={setModalOpen} size='lg' titleId='event-modal'>
				<ModalHeader setIsOpen={setModalOpen}>
					<ModalTitle id='event-modal'>
						{editingEvent ? 'Edit Event' : 'Add Event'}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<form onSubmit={formik.handleSubmit}>
						<FormGroup id='academic_year_id' label='Academic Year' className='mb-3'>
							<Select
								onChange={formik.handleChange}
								value={formik.values.academic_year_id}
								ariaLabel='Academic Year'
								required>
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
							/>
						</FormGroup>
						<FormGroup id='event_date' label='Event Date' className='mb-3'>
							<Input
								type='date'
								onChange={formik.handleChange}
								value={formik.values.event_date}
								required
							/>
						</FormGroup>
						<FormGroup id='event_type' label='Event Type' className='mb-3'>
							<Select
								onChange={formik.handleChange}
								value={formik.values.event_type}
								ariaLabel='Event Type'>
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
							/>
						</FormGroup>
					</form>
				</ModalBody>
				<ModalFooter>
					<Button color='secondary' isOutline onClick={() => setModalOpen(false)}>
						Cancel
					</Button>
					<Button color='primary' onClick={() => formik.handleSubmit()}>
						{editingEvent ? 'Update' : 'Create'}
					</Button>
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

