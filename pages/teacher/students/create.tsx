/**
 * Create Student with Parent Form (Super Admin and Teachers)
 * Creates a new student record and parent account if parent doesn't exist
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
import Select from '../../../components/bootstrap/forms/Select';
import Alert from '../../../components/bootstrap/Alert';
import Spinner from '../../../components/bootstrap/Spinner';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';

const validationSchema = Yup.object({
	// Student fields
	student_full_name: Yup.string().required('Student full name is required'),
	admission_number: Yup.string().required('Admission number is required'),
	class_id: Yup.string().required('Class is required'),
	date_of_birth: Yup.date().required('Date of birth is required'),
	enrollment_date: Yup.date().required('Enrollment date is required'),
	gender: Yup.string().oneOf(['Male', 'Female', 'Other']),
	blood_group: Yup.string(),

	// Parent fields
	parent_email: Yup.string().email('Invalid email address').required('Parent email is required'),
	parent_full_name: Yup.string().required('Parent full name is required'),
	parent_phone: Yup.string(),
	parent_address: Yup.string(),
	temporary_password: Yup.string()
		.min(8, 'Password must be at least 8 characters')
		.required('Temporary password is required'),
});

const CreateStudent: NextPage = () => {
	const router = useRouter();
	const { user, profile, loading, role } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [createdCredentials, setCreatedCredentials] = useState<{
		email: string;
		password: string;
		isNewParent: boolean;
	} | null>(null);
	const [classes, setClasses] = useState<any[]>([]);
	const [loadingClasses, setLoadingClasses] = useState(true);

	// Protect route - super admins and teachers
	useEffect(() => {
		if (!loading && (!user || (role !== UserRole.SUPER_ADMIN && role !== UserRole.TEACHER))) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch classes
	useEffect(() => {
		const fetchClasses = async () => {
			try {
				const { data, error } = await supabase
					.from('classes')
					.select('id, name, grade_level, section')
					.order('grade_level', { ascending: true })
					.order('section', { ascending: true });

				if (error) {
					console.error('Error fetching classes:', error);
					setErrorMessage('Failed to load classes');
				} else {
					setClasses(data || []);
				}
			} catch (error) {
				console.error('Error fetching classes:', error);
			} finally {
				setLoadingClasses(false);
			}
		};

		fetchClasses();
	}, []);

	const formik = useFormik({
		initialValues: {
			student_full_name: '',
			admission_number: '',
			class_id: '',
			date_of_birth: '',
			enrollment_date: new Date().toISOString().split('T')[0], // Default to today
			gender: '',
			blood_group: '',
			parent_email: '',
			parent_full_name: '',
			parent_phone: '',
			parent_address: '',
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

				// Call the API to create student with parent
				const response = await fetch('/api/users/create-student', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session.access_token}`,
					},
					body: JSON.stringify({
						student_full_name: values.student_full_name,
						admission_number: values.admission_number,
						class_id: values.class_id,
						date_of_birth: values.date_of_birth,
						enrollment_date: values.enrollment_date,
						gender: values.gender || undefined,
						blood_group: values.blood_group || undefined,
						parent_email: values.parent_email,
						parent_full_name: values.parent_full_name,
						parent_phone: values.parent_phone || undefined,
						parent_address: values.parent_address || undefined,
						temporary_password: values.temporary_password,
					}),
				});

				const result = await response.json();

				if (!response.ok) {
					setErrorMessage(result.error || 'Failed to create student');
					setIsSubmitting(false);
					return;
				}

				setSuccessMessage('Student created successfully!');
				setCreatedCredentials({
					email: values.parent_email,
					password: values.temporary_password,
					isNewParent: result.parent_created || false,
				});

				// Reset form
				formik.resetForm();
			} catch (error: any) {
				console.error('Error creating student:', error);
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

	if (loading || !user || (role !== UserRole.SUPER_ADMIN && role !== UserRole.TEACHER)) {
		return null;
	}

	return (
		<PageWrapper>
			<Head>
				<title>Add Student - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.back()}>
						Back
					</Button>
					<span className='h4 mb-0 fw-bold ms-3'>Add New Student</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-lg-10 offset-lg-1'>
						<form onSubmit={formik.handleSubmit}>
							{/* Student Information */}
							<Card className='mb-4'>
								<CardHeader>
									<CardLabel icon='School'>
										<CardTitle>Student Information</CardTitle>
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
											{createdCredentials.isNewParent && (
												<>
													<div className='mb-2'>
														A new parent account was created. Please share these
														credentials:
													</div>
													<div className='bg-light p-3 rounded'>
														<div>
															<strong>Email:</strong>{' '}
															{createdCredentials.email}
														</div>
														<div>
															<strong>Temporary Password:</strong>{' '}
															{createdCredentials.password}
														</div>
													</div>
													<div className='mt-2 text-muted small'>
														The parent should change this password on first
														login.
													</div>
												</>
											)}
											{!createdCredentials.isNewParent && (
												<div className='text-muted'>
													Student was linked to existing parent account:{' '}
													{createdCredentials.email}
												</div>
											)}
										</Alert>
									)}

									<div className='row g-4'>
										<div className='col-md-6'>
											<FormGroup
												id='student_full_name'
												label='Full Name'
												isFloating>
												<Input
													placeholder='Full Name'
													value={formik.values.student_full_name}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.student_full_name}
													invalidFeedback={formik.errors.student_full_name}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup
												id='admission_number'
												label='Admission Number'
												isFloating>
												<Input
													placeholder='Admission Number'
													value={formik.values.admission_number}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.admission_number}
													invalidFeedback={formik.errors.admission_number}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup id='class_id' label='Class' isFloating>
												<Select
													placeholder='Select Class'
													value={formik.values.class_id}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.class_id}
													invalidFeedback={formik.errors.class_id}
													disabled={isSubmitting || loadingClasses}
													ariaLabel='Class'>
													<option value=''>Select Class</option>
													{classes.map((cls) => (
														<option key={cls.id} value={cls.id}>
															{cls.grade_level} - {cls.name} {cls.section ? `(${cls.section})` : ''}
														</option>
													))}
												</Select>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup
												id='enrollment_date'
												label='Enrollment Date'
												isFloating>
												<Input
													type='date'
													placeholder='Enrollment Date'
													value={formik.values.enrollment_date}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.enrollment_date}
													invalidFeedback={formik.errors.enrollment_date}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-4'>
											<FormGroup
												id='date_of_birth'
												label='Date of Birth'
												isFloating>
												<Input
													type='date'
													placeholder='Date of Birth'
													value={formik.values.date_of_birth}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.date_of_birth}
													invalidFeedback={formik.errors.date_of_birth}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-4'>
											<FormGroup id='gender' label='Gender' isFloating>
												<Select
													placeholder='Select Gender'
													value={formik.values.gender}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													disabled={isSubmitting}
													ariaLabel='Gender'>
													<option value=''>Select Gender</option>
													<option value='Male'>Male</option>
													<option value='Female'>Female</option>
													<option value='Other'>Other</option>
												</Select>
											</FormGroup>
										</div>
										<div className='col-md-4'>
											<FormGroup id='blood_group' label='Blood Group' isFloating>
												<Input
													placeholder='Blood Group (e.g., A+, O-)'
													value={formik.values.blood_group}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
									</div>
								</CardBody>
							</Card>

							{/* Parent Information */}
							<Card className='mb-4'>
								<CardHeader>
									<CardLabel icon='FamilyRestroom'>
										<CardTitle>Parent Information</CardTitle>
									</CardLabel>
								</CardHeader>
								<CardBody>
									<div className='alert alert-info'>
										<strong>Note:</strong> If the parent email already exists in the
										system, the student will be linked to that existing parent account.
										Otherwise, a new parent account will be created.
									</div>
									<div className='row g-4'>
										<div className='col-md-6'>
											<FormGroup
												id='parent_full_name'
												label='Parent Full Name'
												isFloating>
												<Input
													placeholder='Parent Full Name'
													value={formik.values.parent_full_name}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.parent_full_name}
													invalidFeedback={formik.errors.parent_full_name}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup
												id='parent_email'
												label='Parent Email'
												isFloating>
												<Input
													type='email'
													placeholder='Parent Email'
													value={formik.values.parent_email}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													isValid={formik.isValid}
													isTouched={formik.touched.parent_email}
													invalidFeedback={formik.errors.parent_email}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup
												id='parent_phone'
												label='Parent Phone'
												isFloating>
												<Input
													placeholder='Parent Phone'
													value={formik.values.parent_phone}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
										<div className='col-md-6'>
											<FormGroup
												id='temporary_password'
												label='Temporary Password (for new parent)'
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
											<FormGroup id='parent_address' label='Parent Address'>
												<Textarea
													placeholder='Parent Address'
													value={formik.values.parent_address}
													onChange={formik.handleChange}
													onBlur={formik.handleBlur}
													disabled={isSubmitting}
												/>
											</FormGroup>
										</div>
									</div>
								</CardBody>
							</Card>

							{/* Submit Buttons */}
							<Card>
								<CardBody>
									<div className='d-flex gap-2'>
										<Button
											color='primary'
											type='submit'
											isDisable={isSubmitting || !formik.isValid}>
											{isSubmitting && <Spinner isSmall inButton isGrow />}
											{isSubmitting ? 'Creating...' : 'Add Student'}
										</Button>
										<Button
											color='secondary'
											isOutline
											onClick={() => router.back()}
											isDisable={isSubmitting}>
											Cancel
										</Button>
									</div>
								</CardBody>
							</Card>
						</form>
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

export default CreateStudent;


