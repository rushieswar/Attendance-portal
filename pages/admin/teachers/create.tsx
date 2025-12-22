/**
 * Create Teacher Form (Super Admin Only)
 * Creates a new teacher account with auth user, profile, and teacher record
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Textarea from '../../../components/bootstrap/forms/Textarea';
import Alert from '../../../components/bootstrap/Alert';
import Spinner from '../../../components/bootstrap/Spinner';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';

const validationSchema = Yup.object({
	email: Yup.string().email('Invalid email address').required('Email is required'),
	full_name: Yup.string().required('Full name is required'),
	phone: Yup.string(),
	address: Yup.string(),
	employee_id: Yup.string().required('Employee ID is required'),
	subjects: Yup.string().required('Subjects are required'),
	joining_date: Yup.date().required('Joining date is required'),
	temporary_password: Yup.string()
		.min(8, 'Password must be at least 8 characters')
		.required('Temporary password is required'),
});

const CreateTeacher: NextPage = () => {
	const router = useRouter();
	const { user, profile, loading, role } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [createdCredentials, setCreatedCredentials] = useState<{
		email: string;
		password: string;
	} | null>(null);

	// Protect route - only super admins
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.SUPER_ADMIN)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	const formik = useFormik({
		initialValues: {
			email: '',
			full_name: '',
			phone: '',
			address: '',
			employee_id: '',
			subjects: '',
			joining_date: '',
			temporary_password: '',
		},
		validationSchema,
		onSubmit: async (values) => {
			setIsSubmitting(true);
			setErrorMessage('');
			setSuccessMessage('');

			try {
				// Get the current user's session token
				const { data: { session } } = await supabase.auth.getSession();
				if (!session) {
					setErrorMessage('Session expired. Please login again.');
					setIsSubmitting(false);
					return;
				}

				// Parse subjects as array
				const subjectsArray = values.subjects
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0);

				// Call the API to create teacher
				const response = await fetch('/api/users/create-teacher', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify({
						email: values.email,
						full_name: values.full_name,
						phone: values.phone || undefined,
						address: values.address || undefined,
						employee_id: values.employee_id,
						subjects: subjectsArray,
						joining_date: values.joining_date,
						temporary_password: values.temporary_password,
					}),
				});

				const result = await response.json();

				if (!response.ok) {
					setErrorMessage(result.error || 'Failed to create teacher');
					setIsSubmitting(false);
					return;
				}

				setSuccessMessage('Teacher created successfully!');
				setCreatedCredentials({
					email: values.email,
					password: values.temporary_password,
				});

				// Reset form
				formik.resetForm();
			} catch (error: any) {
				console.error('Error creating teacher:', error);
				setErrorMessage(error.message || 'An unexpected error occurred');
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	const generatePassword = () => {
		const length = 12;
		const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
		let password = '';
		for (let i = 0; i < length; i++) {
			password += charset.charAt(Math.floor(Math.random() * charset.length));
		}
		formik.setFieldValue('temporary_password', password);
	};

	if (loading || !user || role !== UserRole.SUPER_ADMIN) {
		return null;
	}

	return (
		<PageWrapper>
			<Head>
				<title>Create Teacher - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.back()}>
						Back
					</Button>
					<span className='h4 mb-0 fw-bold ms-3'>Create New Teacher</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-lg-8 offset-lg-2'>
						<Card>
							<CardHeader>
								<CardLabel icon='PersonAdd'>
									<CardTitle>Teacher Information</CardTitle>
								</CardLabel>
							</CardHeader>
							<CardBody>
								{errorMessage && (
									<Alert color='danger' isLight icon='Warning' isDismissible>
										{errorMessage}
									</Alert>
								)}

								{successMessage && createdCredentials && (
									<Alert color='success' isLight icon='Check'>
										<div className='fw-bold mb-2'>{successMessage}</div>
										<div className='mb-2'>
											Please share these credentials with the teacher:
										</div>
										<div className='bg-light p-3 rounded'>
											<div>
												<strong>Email:</strong> {createdCredentials.email}
											</div>
											<div>
												<strong>Temporary Password:</strong>{' '}
												{createdCredentials.password}
											</div>
										</div>
										<div className='mt-2 text-muted small'>
											The teacher should change this password on first login.
										</div>
									</Alert>
								)}

								<form onSubmit={formik.handleSubmit}>
									<div className='row g-4'>
										<div className='col-md-6'>
											<FormGroup id='full_name' label='Full Name' isFloating>
												<Input
													placeholder='Full Name'
													value={formik.values.full_name}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.full_name}
													invalidFeedback={formik.errors.full_name}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup id='email' label='Email Address' isFloating>
												<Input
													type='email'
													placeholder='Email Address'
													value={formik.values.email}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.email}
													invalidFeedback={formik.errors.email}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup id='phone' label='Phone Number' isFloating>
												<Input
													placeholder='Phone Number'
													value={formik.values.phone}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup id='employee_id' label='Employee ID' isFloating>
												<Input
													placeholder='Employee ID'
													value={formik.values.employee_id}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.employee_id}
													invalidFeedback={formik.errors.employee_id}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-12'>
											<FormGroup id='address' label='Address'>
												<Textarea
													placeholder='Address'
													value={formik.values.address}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup
												id='subjects'
												label='Subjects (comma-separated)'
												isFloating>
												<Input
													placeholder='e.g., Math, Science, English'
													value={formik.values.subjects}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.subjects}
													invalidFeedback={formik.errors.subjects}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup id='joining_date' label='Joining Date' isFloating>
												<Input
													type='date'
													placeholder='Joining Date'
													value={formik.values.joining_date}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.joining_date}
													invalidFeedback={formik.errors.joining_date}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-12'>
											<FormGroup
												id='temporary_password'
												label='Temporary Password'
												isFloating>
												<Input
													type='text'
													placeholder='Temporary Password'
													value={formik.values.temporary_password}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.temporary_password}
													invalidFeedback={formik.errors.temporary_password}
													disabled={isSubmitting}
												/>
											</FormGroup>
											<Button
												color='info'
												isLight
												size='sm'
												icon='Refresh'
												onClick={generatePassword}
												type='button'
												className='mt-2'>
												Generate Password
											</Button>
										</div>
										<div className='col-12'>
											<div className='d-flex gap-2'>
												<Button
													color='primary'
													type='submit'
													isDisable={isSubmitting || !formik.isValid}>
													{isSubmitting && <Spinner isSmall inButton isGrow />}
													{isSubmitting ? 'Creating...' : 'Create Teacher'}
												</Button>
												<Button
													color='secondary'
													isOutline
													onClick={() => router.back()}
													isDisable={isSubmitting}>
													Cancel
												</Button>
											</div>
										</div>
									</div>
								</form>
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

export default CreateTeacher;

