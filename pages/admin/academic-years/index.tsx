/**
 * Admin - Manage Academic Years
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
import Icon from '../../../components/icon/Icon';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole, AcademicYear } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import { useFormik } from 'formik';
import showNotification from '../../../components/extras/showNotification';

const AcademicYearsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch academic years
	const fetchAcademicYears = async () => {
		try {
			const { data, error } = await supabase
				.from('academic_years')
				.select('*')
				.order('start_date', { ascending: false });

			if (error) throw error;
			setAcademicYears(data || []);
		} catch (error) {
			console.error('Error fetching academic years:', error);
			showNotification('Error', 'Failed to load academic years', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (user) fetchAcademicYears();
	}, [user]);

	const formik = useFormik({
		initialValues: {
			name: '',
			start_date: '',
			end_date: '',
			is_current: false,
		},
		onSubmit: async (values) => {
			try {
				if (editingYear) {
					const { error } = await supabase
						.from('academic_years')
						.update(values)
						.eq('id', editingYear.id);
					if (error) throw error;
					showNotification('Success', 'Academic year updated successfully', 'success');
				} else {
					const { error } = await supabase.from('academic_years').insert([values]);
					if (error) throw error;
					showNotification('Success', 'Academic year created successfully', 'success');
				}
				setModalOpen(false);
				formik.resetForm();
				setEditingYear(null);
				fetchAcademicYears();
			} catch (error: any) {
				showNotification('Error', error.message, 'danger');
			}
		},
	});

	const handleEdit = (year: AcademicYear) => {
		setEditingYear(year);
		formik.setValues({
			name: year.name,
			start_date: year.start_date,
			end_date: year.end_date,
			is_current: year.is_current,
		});
		setModalOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this academic year?')) return;
		try {
			const { error } = await supabase.from('academic_years').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Academic year deleted successfully', 'success');
			fetchAcademicYears();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	const handleSetCurrent = async (id: string) => {
		try {
			// First, set all to false
			await supabase.from('academic_years').update({ is_current: false }).neq('id', '');
			// Then set the selected one to true
			const { error } = await supabase.from('academic_years').update({ is_current: true }).eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Current academic year updated', 'success');
			fetchAcademicYears();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	if (loading || !user || role !== UserRole.SUPER_ADMIN) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Manage Academic Years - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/admin/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Manage Academic Years</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='primary'
						icon='Add'
						onClick={() => {
							setEditingYear(null);
							formik.resetForm();
							setModalOpen(true);
						}}>
						Add Academic Year
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='CalendarToday'>
									<CardTitle>Academic Years</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Name</th>
												<th>Start Date</th>
												<th>End Date</th>
												<th>Status</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{academicYears.map((year) => (
												<tr key={year.id}>
													<td>
														<div className='fw-bold'>{year.name}</div>
													</td>
													<td>{new Date(year.start_date).toLocaleDateString()}</td>
													<td>{new Date(year.end_date).toLocaleDateString()}</td>
													<td>
														{year.is_current ? (
															<span className='badge bg-success'>Current</span>
														) : (
															<Button
																size='sm'
																color='info'
																isLight
																onClick={() => handleSetCurrent(year.id)}>
																Set as Current
															</Button>
														)}
													</td>
													<td className='text-end'>
														<Button
															icon='Edit'
															color='info'
															isLight
															size='sm'
															className='me-2'
															onClick={() => handleEdit(year)}>
															Edit
														</Button>
														<Button
															icon='Delete'
															color='danger'
															isLight
															size='sm'
															onClick={() => handleDelete(year.id)}>
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
			<Modal isOpen={modalOpen} setIsOpen={setModalOpen} size='lg' titleId='academic-year-modal'>
				<ModalHeader setIsOpen={setModalOpen}>
					<ModalTitle id='academic-year-modal'>
						{editingYear ? 'Edit Academic Year' : 'Add Academic Year'}
					</ModalTitle>
				</ModalHeader>
				<ModalBody>
					<form onSubmit={formik.handleSubmit}>
						<FormGroup id='name' label='Academic Year Name' className='mb-3'>
							<Input
								onChange={formik.handleChange}
								value={formik.values.name}
								placeholder='e.g., 2024-2025'
								required
							/>
						</FormGroup>
						<div className='row'>
							<div className='col-md-6'>
								<FormGroup id='start_date' label='Start Date' className='mb-3'>
									<Input
										type='date'
										onChange={formik.handleChange}
										value={formik.values.start_date}
										required
									/>
								</FormGroup>
							</div>
							<div className='col-md-6'>
								<FormGroup id='end_date' label='End Date' className='mb-3'>
									<Input
										type='date'
										onChange={formik.handleChange}
										value={formik.values.end_date}
										required
									/>
								</FormGroup>
							</div>
						</div>
						<div className='form-check'>
							<input
								className='form-check-input'
								type='checkbox'
								id='is_current'
								checked={formik.values.is_current}
								onChange={formik.handleChange}
							/>
							<label className='form-check-label' htmlFor='is_current'>
								Set as current academic year
							</label>
						</div>
					</form>
				</ModalBody>
				<ModalFooter>
					<Button color='info' isOutline onClick={() => setModalOpen(false)}>
						Cancel
					</Button>
					<Button color='primary' onClick={() => formik.handleSubmit()}>
						{editingYear ? 'Update' : 'Create'}
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

export default AcademicYearsPage;


