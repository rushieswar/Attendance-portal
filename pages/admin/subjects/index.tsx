/**
 * Admin - Manage Subjects
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
import { UserRole, Subject } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import { useFormik } from 'formik';
import showNotification from '../../../components/extras/showNotification';

const SubjectsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch subjects
	const fetchSubjects = async () => {
		try {
			const { data, error } = await supabase
				.from('subjects')
				.select('*')
				.order('name', { ascending: true });

			if (error) throw error;
			setSubjects(data || []);
		} catch (error) {
			console.error('Error fetching subjects:', error);
			showNotification('Error', 'Failed to load subjects', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchSubjects();
	}, [user]);

	const formik = useFormik({
		initialValues: {
			name: '',
			code: '',
			grade_level: '',
			description: '',
		},
		onSubmit: async (values) => {
			try {
				if (editingSubject) {
					const { error } = await supabase
						.from('subjects')
						.update(values)
						.eq('id', editingSubject.id);
					if (error) throw error;
					showNotification('Success', 'Subject updated successfully', 'success');
				} else {
					const { error } = await supabase.from('subjects').insert([values]);
					if (error) throw error;
					showNotification('Success', 'Subject created successfully', 'success');
				}
				setModalOpen(false);
				formik.resetForm();
				setEditingSubject(null);
				fetchSubjects();
			} catch (error: any) {
				showNotification('Error', error.message, 'danger');
			}
		},
	});

	const handleEdit = (subject: Subject) => {
		setEditingSubject(subject);
		formik.setValues({
			name: subject.name,
			code: subject.code,
			grade_level: subject.grade_level || '',
			description: subject.description || '',
		});
		setModalOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this subject?')) return;
		try {
			const { error } = await supabase.from('subjects').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Subject deleted successfully', 'success');
			fetchSubjects();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Manage Subjects - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Manage Subjects</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='primary'
						icon='Add'
						onClick={() => {
							setEditingSubject(null);
							formik.resetForm();
							setModalOpen(true);
						}}>
						Add Subject
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='MenuBook'>
									<CardTitle>Subjects</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Subject Name</th>
												<th>Code</th>
												<th>Grade Level</th>
												<th>Description</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{subjects.map((subject) => (
												<tr key={subject.id}>
													<td>
														<div className='fw-bold'>{subject.name}</div>
													</td>
													<td>{subject.code}</td>
													<td>{subject.grade_level || 'All'}</td>
													<td>{subject.description || '-'}</td>
													<td className='text-end'>
														<Button
															icon='Edit'
															color='info'
															isLight
															size='sm'
															className='me-2'
															onClick={() => handleEdit(subject)}>
															Edit
														</Button>
														<Button
															icon='Delete'
															color='danger'
															isLight
															size='sm'
															onClick={() => handleDelete(subject.id)}>
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
			<Modal isOpen={modalOpen} setIsOpen={setModalOpen} size='lg' titleId='subject-modal'>
				<ModalHeader setIsOpen={setModalOpen}>
					<ModalTitle id='subject-modal'>
						{editingSubject ? 'Edit Subject' : 'Add Subject'}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<form onSubmit={formik.handleSubmit}>
						<div className='row'>
							<div className='col-md-6'>
								<FormGroup id='name' label='Subject Name' className='mb-3'>
									<Input
										onChange={formik.handleChange}
										value={formik.values.name}
										placeholder='e.g., Mathematics'
										required
									/>
								</FormGroup>
							</div>
							<div className='col-md-6'>
								<FormGroup id='code' label='Subject Code' className='mb-3'>
									<Input
										onChange={formik.handleChange}
										value={formik.values.code}
										placeholder='e.g., MATH101'
										required
									/>
								</FormGroup>
							</div>
						</div>
						<FormGroup id='grade_level' label='Grade Level (Optional)' className='mb-3'>
							<Input
								onChange={formik.handleChange}
								value={formik.values.grade_level}
								placeholder='e.g., 10 (leave empty for all grades)'
							/>
						</FormGroup>
						<FormGroup id='description' label='Description (Optional)' className='mb-3'>
							<Textarea
								onChange={formik.handleChange}
								value={formik.values.description}
								placeholder='Brief description of the subject'
								rows={3}
							/>
						</FormGroup>
					</form>
				</ModalBody>
				<ModalFooter>
					<Button color='info' isOutline onClick={() => setModalOpen(false)}>
						Cancel
					</Button>
					<Button color='primary' onClick={() => formik.handleSubmit()}>
						{editingSubject ? 'Update' : 'Create'}
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

export default SubjectsPage;


