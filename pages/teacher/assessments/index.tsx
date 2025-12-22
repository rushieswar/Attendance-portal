/**
 * Teacher - Manage Assessments
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
import { UserRole, Assessment, AcademicYear } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '../../../components/bootstrap/Modal';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Select from '../../../components/bootstrap/forms/Select';
import { useFormik } from 'formik';
import showNotification from '../../../components/extras/showNotification';

interface AssessmentWithYear extends Assessment {
	academic_year?: AcademicYear;
}

const AssessmentsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [assessments, setAssessments] = useState<AssessmentWithYear[]>([]);
	const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || (role !== UserRole.SUPER_ADMIN && role !== UserRole.TEACHER))) {
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

			// Fetch assessments
			const { data: assessmentsData, error: assessmentsError } = await supabase
				.from('assessments')
				.select(`
					*,
					academic_year:academic_years(*)
				`)
				.order('assessment_date', { ascending: false });

			if (assessmentsError) throw assessmentsError;
			setAssessments(assessmentsData || []);
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
			description: '',
			assessment_date: '',
			max_marks: 100,
		},
		onSubmit: async (values) => {
			try {
				const payload = {
					...values,
					created_by: user?.id,
				};

				if (editingAssessment) {
					const { error } = await supabase
						.from('assessments')
						.update(payload)
						.eq('id', editingAssessment.id);
					if (error) throw error;
					showNotification('Success', 'Assessment updated successfully', 'success');
				} else {
					const { error } = await supabase.from('assessments').insert([payload]);
					if (error) throw error;
					showNotification('Success', 'Assessment created successfully', 'success');
				}
				setModalOpen(false);
				formik.resetForm();
				setEditingAssessment(null);
				fetchData();
			} catch (error: any) {
				showNotification('Error', error.message, 'danger');
			}
		},
	});

	const handleEdit = (assessment: Assessment) => {
		setEditingAssessment(assessment);
		formik.setValues({
			academic_year_id: assessment.academic_year_id,
			name: assessment.name,
			description: assessment.description || '',
			assessment_date: assessment.assessment_date || '',
			max_marks: assessment.max_marks,
		});
		setModalOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this assessment?')) return;
		try {
			const { error } = await supabase.from('assessments').delete().eq('id', id);
			if (error) throw error;
			showNotification('Success', 'Assessment deleted successfully', 'success');
			fetchData();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		}
	};

	const handleEnterMarks = (assessmentId: string) => {
		router.push(`/teacher/assessments/${assessmentId}/marks`);
	};

	if (loading || !user || (role !== UserRole.SUPER_ADMIN && role !== UserRole.TEACHER)) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Manage Assessments - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/teacher/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Manage Assessments</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='primary'
						icon='Add'
						onClick={() => {
							setEditingAssessment(null);
							formik.resetForm();
							setModalOpen(true);
						}}>
						Create Assessment
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						<Card>
							<CardHeader>
								<CardLabel icon='Assessment'>
									<CardTitle>Assessments</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody className='table-responsive'>
								{loadingData ? (
									<div className='text-center py-5'>Loading...</div>
								) : (
									<table className='table table-modern table-hover'>
										<thead>
											<tr>
												<th>Assessment Name</th>
												<th>Academic Year</th>
												<th>Date</th>
												<th>Max Marks</th>
												<th className='text-end'>Actions</th>
											</tr>
										</thead>
										<tbody>
											{assessments.map((assessment) => (
												<tr key={assessment.id}>
													<td>
														<div className='fw-bold'>{assessment.name}</div>
														<div className='text-muted small'>{assessment.description}</div>
													</td>
													<td>{assessment.academic_year?.name || 'N/A'}</td>
													<td>
														{assessment.assessment_date
															? new Date(assessment.assessment_date).toLocaleDateString()
															: '-'}
													</td>
													<td>{assessment.max_marks}</td>
													<td className='text-end'>
														<Button
															icon='Edit'
															color='success'
															isLight
															size='sm'
															className='me-2'
															onClick={() => handleEnterMarks(assessment.id)}>
															Enter Marks
														</Button>
														<Button
															icon='Edit'
															color='info'
															isLight
															size='sm'
															className='me-2'
															onClick={() => handleEdit(assessment)}>
															Edit
														</Button>
														<Button
															icon='Delete'
															color='danger'
															isLight
															size='sm'
															onClick={() => handleDelete(assessment.id)}>
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
			<Modal isOpen={modalOpen} setIsOpen={setModalOpen} size='lg' titleId='assessment-modal'>
				<ModalHeader setIsOpen={setModalOpen}>
					<ModalTitle id='assessment-modal'>
						{editingAssessment ? 'Edit Assessment' : 'Create Assessment'}
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
						<FormGroup id='name' label='Assessment Name' className='mb-3'>
							<Input
								onChange={formik.handleChange}
								value={formik.values.name}
								placeholder='e.g., Mid-Term Exam, Unit Test 1'
								required
							/>
						</FormGroup>
						<FormGroup id='description' label='Description (Optional)' className='mb-3'>
							<Textarea
								onChange={formik.handleChange}
								value={formik.values.description}
								placeholder='Brief description'
								rows={3}
							/>
						</FormGroup>
						<div className='row'>
							<div className='col-md-6'>
								<FormGroup id='assessment_date' label='Assessment Date' className='mb-3'>
									<Input
										type='date'
										onChange={formik.handleChange}
										value={formik.values.assessment_date}
									/>
								</FormGroup>
							</div>
							<div className='col-md-6'>
								<FormGroup id='max_marks' label='Maximum Marks' className='mb-3'>
									<Input
										type='number'
										onChange={formik.handleChange}
										value={formik.values.max_marks}
										min={1}
										required
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
						{editingAssessment ? 'Update' : 'Create'}
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

export default AssessmentsPage;


