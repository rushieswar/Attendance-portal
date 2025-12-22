/**
 * Admin - Manage Classes
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
import { UserRole, Class, AcademicYear } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Select from '../../../components/bootstrap/forms/Select';
import { useFormik } from 'formik';
import showNotification from '../../../components/extras/showNotification';

interface ClassWithYear extends Class {
	academic_year?: AcademicYear;
}

const ClassesPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [classes, setClasses] = useState<ClassWithYear[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingClass, setEditingClass] = useState<Class | null>(null);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch data
	const fetchData = async () => {
		try {
			// Fetch academic years
			const { data: yearsData, error: yearsError } = await supabase
				.from('academic_years')
				.select('*')
				.order('start_date', { ascending: false });

			if (yearsError) throw yearsError;
			setAcademicYears(yearsData || []);

			// Fetch classes with academic year info
			const { data: classesData, error: classesError } = await supabase
				.from('classes')
				.select(`
					*,
					academic_year:academic_years(*)
				`)
				.order('grade_level', { ascending: true });

			if (classesError) throw classesError;
			setClasses(classesData || []);
		} catch (error) {
			console.error('Error fetching data:', error);
			showNotification('Error', 'Failed to load data', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchData();
	}, [user]);

	const formik = useFormik({
		initialValues: {
			academic_year_id: '',
			name: '',
			grade_level: '',
			section: '',
		},
		onSubmit: async (values) => {
			try {
				if (editingClass) {
					const { error } = await supabase
						.from('classes')
						.update(values)
						.eq('id', editingClass.id);
					if (error) throw error;
					showNotification('Success', 'Class updated successfully', 'success');
				} else {
					const { error } = await supabase.from('classes').insert([values]);
					if (error) throw error;
					showNotification('Success', 'Class created successfully', 'success');
				}
				setModalOpen(false);
				formik.resetForm();
				setEditingClass(null);
				fetchData();
			} catch (error: any) {
				showNotification('Error', error.message, 'danger');
			}
		},
	});

	const handleEdit = (classItem: Class) => {
		setEditingClass(classItem);
		formik.setValues({
			academic_year_id: classItem.academic_year_id,
			name: classItem.name,
			grade_level: classItem.grade_level,
			section: classItem.section || '',
		});
		setModalOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this class?')) return;
		try {
			const { error } = await supabase.from('classes').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Class deleted successfully', 'success');
			fetchData();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Manage Classes - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Manage Classes</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='primary'
						icon='Add'
						onClick={() => {
							setEditingClass(null);
							formik.resetForm();
							setModalOpen(true);
						}}>
						Add Class
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='Class'>
									<CardTitle>Classes</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Class Name</th>
												<th>Grade Level</th>
												<th>Section</th>
												<th>Academic Year</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{classes.map((classItem) => (
												<tr key={classItem.id}>
													<td>
														<div className='fw-bold'>{classItem.name}</div>
													</td>
													<td>{classItem.grade_level}</td>
													<td>{classItem.section || '-'}</td>
													<td>{classItem.academic_year?.name || 'N/A'}</td>
													<td className='text-end'>
														<Button
															icon='Edit'
															color='info'
															isLight
															size='sm'
															className='me-2'
															onClick={() => handleEdit(classItem)}>
															Edit
														</Button>
														<Button
															icon='Delete'
															color='danger'
															isLight
															size='sm'
															onClick={() => handleDelete(classItem.id)}>
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
			<Modal isOpen={modalOpen} setIsOpen={setModalOpen} size='lg' titleId='class-modal'>
				<ModalHeader setIsOpen={setModalOpen}>
					<ModalTitle id='class-modal'>
						{editingClass ? 'Edit Class' : 'Add Class'}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<form onSubmit={formik.handleSubmit}>
						<FormGroup id='academic_year_id' label='Academic Year' className='mb-3'>
							<Select
								onChange={formik.handleChange}
								value={formik.values.academic_year_id}
								required>
								<option value=''>Select Academic Year</option>
								{academicYears.map((year) => (
									<option key={year.id} value={year.id}>
										{year.name}
									</option>
								))}
							</Select>
						</FormGroup>
						<FormGroup id='name' label='Class Name' className='mb-3'>
							<Input
								onChange={formik.handleChange}
								value={formik.values.name}
								placeholder='e.g., Grade 10 - A'
								required
							/>
						</FormGroup>
						<div className='row'>
							<div className='col-md-6'>
								<FormGroup id='grade_level' label='Grade Level' className='mb-3'>
									<Input
										onChange={formik.handleChange}
										value={formik.values.grade_level}
										placeholder='e.g., 10'
										required
									/>
								</FormGroup>
							</div>
							<div className='col-md-6'>
								<FormGroup id='section' label='Section (Optional)' className='mb-3'>
									<Input
										onChange={formik.handleChange}
										value={formik.values.section}
										placeholder='e.g., A'
									/>
								</FormGroup>
							</div>
						</div>
					</form>
				</ModalBody>
				<ModalFooter>
					<Button color='info' isOutline onClick={() => setModalOpen(false)}>
						Cancel
					</Button>
					<Button color='primary' onClick={() => formik.handleSubmit()}>
						{editingClass ? 'Update' : 'Create'}
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

export default ClassesPage;


