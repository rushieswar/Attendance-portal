/**
 * Admin - Manage Announcements
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import { useFormik } from 'formik';
import showNotification from '../../../components/extras/showNotification';

interface Announcement {
	id: string;
	title: string;
	content: string;
	target_audience: string[];
	is_published: boolean;
	published_at: string | null;
	created_at: string;
}

const AnnouncementsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch announcements
	const fetchAnnouncements = async () => {
		try {
			const { data, error } = await supabase
				.from('announcements')
				.select('*')
				.order('created_at', { ascending: false });

			if (error) throw error;
			setAnnouncements(data || []);
		} catch (error) {
			console.error('Error fetching announcements:', error);
			showNotification('Error', 'Failed to load announcements', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchAnnouncements();
	}, [user]);

	const formik = useFormik({
		initialValues: {
			title: '',
			content: '',
			target_audience: [] as string[],
			is_published: false,
		},
		onSubmit: async (values) => {
			try {
				const payload = {
					...values,
					created_by: user?.id,
					published_at: values.is_published ? new Date().toISOString() : null,
				};

				if (editingAnnouncement) {
					const { error } = await supabase
						.from('announcements')
						.update(payload)
						.eq('id', editingAnnouncement.id);
					if (error) throw error;
					showNotification('Success', 'Announcement updated successfully', 'success');
				} else {
					const { error } = await supabase.from('announcements').insert([payload]);
					if (error) throw error;
					showNotification('Success', 'Announcement created successfully', 'success');
				}
				setModalOpen(false);
				formik.resetForm();
				setEditingAnnouncement(null);
				fetchAnnouncements();
			} catch (error: any) {
				showNotification('Error', error.message, 'danger');
			}
		},
	});

	const handleEdit = (announcement: Announcement) => {
		setEditingAnnouncement(announcement);
		formik.setValues({
			title: announcement.title,
			content: announcement.content,
			target_audience: announcement.target_audience,
			is_published: announcement.is_published,
		});
		setModalOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this announcement?')) return;
		try {
			const { error } = await supabase.from('announcements').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Announcement deleted successfully', 'success');
			fetchAnnouncements();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	const handleTogglePublish = async (id: string, currentStatus: boolean) => {
		try {
			const { error } = await supabase
				.from('announcements')
				.update({
					is_published: !currentStatus,
					published_at: !currentStatus ? new Date().toISOString() : null,
				})
				.eq('id', id);
			if (error) throw error;
			showNotification('Success', `Announcement ${!currentStatus ? 'published' : 'unpublished'}`, 'success');
			fetchAnnouncements();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	const handleAudienceChange = (audience: string) => {
		const current = formik.values.target_audience;
		if (current.includes(audience)) {
			formik.setFieldValue('target_audience', current.filter((a) => a !== audience));
		} else {
			formik.setFieldValue('target_audience', [...current, audience]);
		}
	};

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Manage Announcements - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Manage Announcements</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='primary'
						icon='Add'
						onClick={() => {
							setEditingAnnouncement(null);
							formik.resetForm();
							setModalOpen(true);
						}}>
						Create Announcement
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='Campaign'>
									<CardTitle>Announcements</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Title</th>
												<th>Target Audience</th>
												<th>Status</th>
												<th>Created</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{announcements.map((announcement) => (
												<tr key={announcement.id}>
													<td>
														<div className='fw-bold'>{announcement.title}</div>
														<div className='text-muted small'>
															{announcement.content.substring(0, 60)}...
														</div>
													</td>
													<td>
														{announcement.target_audience.map((aud) => (
															<span key={aud} className='badge bg-info me-1'>
																{aud}
															</span>
														))}
													</td>
													<td>
														{announcement.is_published ? (
															<span className='badge bg-success'>Published</span>
														) : (
															<span className='badge bg-warning'>Draft</span>
														)}
													</td>
													<td>{new Date(announcement.created_at).toLocaleDateString()}</td>
													<td className='text-end'>
														<Button
															icon={announcement.is_published ? 'Unpublished' : 'Publish'}
															color={announcement.is_published ? 'warning' : 'success'}
															isLight
															size='sm'
															className='me-2'
															onClick={() => handleTogglePublish(announcement.id, announcement.is_published)}>
															{announcement.is_published ? 'Unpublish' : 'Publish'}
														</Button>
														<Button
															icon='Edit'
															color='info'
															isLight
															size='sm'
															className='me-2'
															onClick={() => handleEdit(announcement)}>
															Edit
														</Button>
														<Button
															icon='Delete'
															color='danger'
															isLight
															size='sm'
															onClick={() => handleDelete(announcement.id)}>
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
			<Modal isOpen={modalOpen} setIsOpen={setModalOpen} size='lg' titleId='announcement-modal'>
				<ModalHeader setIsOpen={setModalOpen}>
					<ModalTitle id='announcement-modal'>
						{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<form onSubmit={formik.handleSubmit}>
						<FormGroup id='title' label='Title' className='mb-3'>
							<Input
								onChange={formik.handleChange}
								value={formik.values.title}
								placeholder='Announcement title'
								required
							/>
						</FormGroup>
						<FormGroup id='content' label='Content' className='mb-3'>
							<Textarea
								onChange={formik.handleChange}
								value={formik.values.content}
								placeholder='Announcement content'
								rows={5}
								required
							/>
						</FormGroup>
						<div className='mb-3'>
							<label className='form-label'>Target Audience</label>
							<div>
								{['teachers', 'parents', 'all'].map((audience) => (
									<div key={audience} className='form-check form-check-inline'>
										<input
											className='form-check-input'
											type='checkbox'
											id={`audience-${audience}`}
											checked={formik.values.target_audience.includes(audience)}
											onChange={() => handleAudienceChange(audience)}
										/>
										<label className='form-check-label' htmlFor={`audience-${audience}`}>
											{audience.charAt(0).toUpperCase() + audience.slice(1)}
										</label>
									</div>
								))}
							</div>
						</div>
						<div className='form-check'>
							<input
								className='form-check-input'
								type='checkbox'
								id='is_published'
								checked={formik.values.is_published}
								onChange={formik.handleChange}
							/>
							<label className='form-check-label' htmlFor='is_published'>
								Publish immediately
							</label>
						</div>
					</form>
				</ModalBody>
				<ModalFooter>
					<Button color='info' isOutline onClick={() => setModalOpen(false)}>
						Cancel
					</Button>
					<Button color='primary' onClick={() => formik.handleSubmit()}>
						{editingAnnouncement ? 'Update' : 'Create'}
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

export default AnnouncementsPage;


