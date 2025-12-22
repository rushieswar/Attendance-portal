/**
 * Parent - Apply for Leave
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Select from '../../../components/bootstrap/forms/Select';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface Student {
	id: string;
	full_name: string;
	admission_number: string;
}

const validationSchema = Yup.object({
	student_id: Yup.string().required('Please select a student'),
	start_date: Yup.date().required('Start date is required'),
	end_date: Yup.date()
		.required('End date is required')
		.min(Yup.ref('start_date'), 'End date must be after start date'),
	reason: Yup.string().required('Reason is required').min(10, 'Reason must be at least 10 characters'),
});

const ApplyLeavePage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [children, setChildren] = useState<Student[]>([]);
	const [loadingChildren, setLoadingChildren] = useState(true);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.PARENT)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch children
	useEffect(() => {
		const fetchChildren = async () => {
			if (!user) return;
			try {
				const { data, error } = await supabase
					.from('students')
					.select('id, full_name, admission_number')
					.eq('parent_id', user.id)
					.order('full_name');

				if (error) throw error;
				setChildren(data || []);
			} catch (error) {
				console.error('Error fetching children:', error);
			} finally {
				setLoadingChildren(false);
			}
		};
		fetchChildren();
	}, [user]);

	const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
		try {
			const { error } = await supabase.from('leave_applications').insert([
				{
					student_id: values.student_id,
					start_date: values.start_date,
					end_date: values.end_date,
					reason: values.reason,
					status: 'pending',
					applied_by: user?.id,
				},
			]);

			if (error) throw error;

			showNotification('Success', 'Leave request submitted successfully', 'success');
			resetForm();
			router.push('/parent/leave/requests');
		} catch (error) {
			console.error('Error submitting leave request:', error);
			showNotification('Error', 'Failed to submit leave request', 'danger');
		} finally {
			setSubmitting(false);
		}
	};

	if (loading || !user || role !== UserRole.PARENT) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Apply for Leave - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/parent/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Apply for Leave</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-lg-8 offset-lg-2'>
						<Card>
							<CardHeader>
								<CardLabel icon='EventNote'>
									<CardTitle>Leave Application Form</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								{loadingChildren ? (
									<div className='text-center py-5'>Loading...</div>
								) : children.length === 0 ? (
									<div className='text-center py-5 text-muted'>
										No children found. Please contact the school administrator.
									</div>
								) : (
									<Formik
										initialValues={{
											student_id: '',
											start_date: '',
											end_date: '',
											reason: '',
										}}
										validationSchema={validationSchema}
										onSubmit={handleSubmit}>
										{({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
											<Form>
												<div className='row g-4'>
													<div className='col-12'>
														<FormGroup id='student_id' label='Select Student'>
															<Select
																name='student_id'
																value={values.student_id}
																onChange={handleChange}
																onBlur={handleBlur}
																ariaLabel='Select Student'
																isValid={touched.student_id && !errors.student_id}
																isTouched={touched.student_id}
																invalidFeedback={errors.student_id}>
																<option value=''>Select a student</option>
																{children.map((child) => (
																	<option key={child.id} value={child.id}>
																		{child.full_name} ({child.admission_number})
																	</option>
																))}
															</Select>
														</FormGroup>
													</div>
													<div className='col-md-6'>
														<FormGroup id='start_date' label='Start Date'>
															<Input
																type='date'
																name='start_date'
																value={values.start_date}
																onChange={handleChange}
																onBlur={handleBlur}
																isValid={touched.start_date && !errors.start_date}
																isTouched={touched.start_date}
																invalidFeedback={errors.start_date}
															/>
														</FormGroup>
													</div>
													<div className='col-md-6'>
														<FormGroup id='end_date' label='End Date'>
															<Input
																type='date'
																name='end_date'
																value={values.end_date}
																onChange={handleChange}
																onBlur={handleBlur}
																isValid={touched.end_date && !errors.end_date}
																isTouched={touched.end_date}
																invalidFeedback={errors.end_date}
															/>
														</FormGroup>
													</div>
													<div className='col-12'>
														<FormGroup id='reason' label='Reason for Leave'>
															<Textarea
																name='reason'
																value={values.reason}
																onChange={handleChange}
																onBlur={handleBlur}
																rows={4}
																placeholder='Please provide a detailed reason for the leave request...'
																isValid={touched.reason && !errors.reason}
																isTouched={touched.reason}
																invalidFeedback={errors.reason}
															/>
														</FormGroup>
													</div>
													<div className='col-12'>
														<div className='d-flex justify-content-end gap-3'>
															<Button
																color='secondary'
																onClick={() => router.push('/parent/dashboard')}>
																Cancel
															</Button>
															<Button
																color='primary'
																type='submit'
																isDisable={isSubmitting}>
																{isSubmitting ? 'Submitting...' : 'Submit Request'}
															</Button>
														</div>
													</div>
												</div>
											</Form>
										)}
									</Formik>
								)}
							</CardBody>
						</Card>
					</div>
				</div>
			</Page>
		</PageWrapper>
	);
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default ApplyLeavePage;


