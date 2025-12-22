import React, { FC, useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useFormik } from 'formik';
import classNames from 'classnames';
import Link from 'next/link';
import useDarkMode from '../../../hooks/useDarkMode';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import Card, { CardBody } from '../../../components/bootstrap/Card';
import Logo from '../../../components/Logo';
import Button from '../../../components/bootstrap/Button';
import Alert from '../../../components/bootstrap/Alert';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Input from '../../../components/bootstrap/forms/Input';
import Spinner from '../../../components/bootstrap/Spinner';
import { supabase } from '../../../lib/supabase/client';
import { UserRole } from '../../../lib/types/database';

interface ILoginHeaderProps {
	isNewUser?: boolean;
}
const LoginHeader: FC<ILoginHeaderProps> = ({ isNewUser }) => {
	if (isNewUser) {
		return (
			<>
				<div className='text-center h1 fw-bold mt-5'>Create Account,</div>
				<div className='text-center h4 text-muted mb-5'>Sign up to get started!</div>
			</>
		);
	}
	return (
		<>
			<div className='text-center h1 fw-bold mt-5'>Welcome,</div>
			<div className='text-center h4 text-muted mb-5'>Sign in to continue!</div>
		</>
	);
};

interface ILoginProps {
	isSignUp?: boolean;
}

const Login: NextPage<ILoginProps> = ({ isSignUp }) => {
	const router = useRouter();
	const { darkModeStatus } = useDarkMode();

	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [successMessage, setSuccessMessage] = useState<string>('');

	// Check if user is already logged in
	useEffect(() => {
		const checkUser = async () => {
			const { data: { session } } = await supabase.auth.getSession();
			if (session?.user) {
				// User is already logged in, redirect to appropriate dashboard
				await redirectToDashboard(session.user.id);
			}
		};
		checkUser();
	}, []);

	// Function to redirect user based on their role
	const redirectToDashboard = async (userId: string) => {
		try {
			const { data: profile, error } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', userId)
				.single();

			if (error || !profile) {
				console.error('Error fetching profile:', error);
				setErrorMessage('Failed to load user profile. Please try again.');
				return;
			}

			// Redirect based on role
			switch (profile.role) {
				case UserRole.SUPER_ADMIN:
					router.push('/admin/dashboard');
					break;
				case UserRole.TEACHER:
					router.push('/teacher/dashboard');
					break;
				case UserRole.PARENT:
					router.push('/parent/dashboard');
					break;
				default:
					setErrorMessage('Invalid user role. Please contact administrator.');
			}
		} catch (error) {
			console.error('Error redirecting:', error);
			setErrorMessage('An error occurred. Please try again.');
		}
	};

	const formik = useFormik({
		initialValues: {
			email: '',
			password: '',
		},
		validate: (values) => {
			const errors: { email?: string; password?: string } = {};

			if (!values.email) {
				errors.email = 'Email is required';
			} else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
				errors.email = 'Invalid email address';
			}

			if (!values.password) {
				errors.password = 'Password is required';
			}

			return errors;
		},
		onSubmit: async (values) => {
			setIsLoading(true);
			setErrorMessage('');
			setSuccessMessage('');

			try {
				// Sign in with Supabase
				const { data, error } = await supabase.auth.signInWithPassword({
					email: values.email,
					password: values.password,
				});

				if (error) {
					setErrorMessage(error.message);
					setIsLoading(false);
					return;
				}

				if (data.user) {
					setSuccessMessage('Login successful! Redirecting...');
					// Redirect to appropriate dashboard
					await redirectToDashboard(data.user.id);
				}
			} catch (error: any) {
				console.error('Login error:', error);
				setErrorMessage(error.message || 'An error occurred during login');
				setIsLoading(false);
			}
		},
	});

	return (
		<PageWrapper isProtected={false} className='bg-dark'>
			<Head>
				<title>Login - School Management System</title>
			</Head>
			<Page className='p-0'>
				<div className='row h-100 align-items-center justify-content-center'>
					<div className='col-xl-4 col-lg-6 col-md-8 shadow-3d-container'>
						<Card className='shadow-3d-dark' data-tour='login-page'>
							<CardBody>
								<div className='text-center my-5'>
									<Link
										href='/'
										className={classNames(
											'text-decoration-none fw-bold display-2',
											{
												'text-dark': !darkModeStatus,
												'text-light': darkModeStatus,
											},
										)}>
										<Logo width={200} />
									</Link>
								</div>

								<LoginHeader isNewUser={false} />

								{/* Error Alert */}
								{errorMessage && (
									<Alert color='danger' isLight icon='Warning' isDismissible>
										{errorMessage}
									</Alert>
								)}

								{/* Success Alert */}
								{successMessage && (
									<Alert color='success' isLight icon='Check' isDismissible>
										{successMessage}
									</Alert>
								)}

								<form className='row g-4' onSubmit={formik.handleSubmit}>
									<div className='col-12'>
										<FormGroup
											id='email'
											isFloating
											label='Email Address'>
											<Input
												type='email'
												autoComplete='email'
												value={formik.values.email}
												isTouched={formik.touched.email}
												invalidFeedback={formik.errors.email}
												isValid={formik.isValid}
												onChange={formik.handleChange}
												onBlur={formik.handleBlur}
												disabled={isLoading}
											/>
										</FormGroup>
									</div>
									<div className='col-12'>
										<FormGroup
											id='password'
											isFloating
											label='Password'>
											<Input
												type='password'
												autoComplete='current-password'
												value={formik.values.password}
												isTouched={formik.touched.password}
												invalidFeedback={formik.errors.password}
												isValid={formik.isValid}
												onChange={formik.handleChange}
												onBlur={formik.handleBlur}
												disabled={isLoading}
											/>
										</FormGroup>
									</div>
									<div className='col-12'>
										<Button
											color='warning'
											className='w-100 py-3'
											type='submit'
											isDisable={isLoading || !formik.isValid}>
											{isLoading && <Spinner isSmall inButton isGrow />}
											{isLoading ? 'Signing in...' : 'Sign In'}
										</Button>
									</div>
								</form>

								<div className='col-12 mt-4'>
									<div className='text-center text-muted'>
										<small>
											Contact your administrator if you need login credentials.
										</small>
									</div>
								</div>
							</CardBody>
						</Card>
						<div className='text-center mt-3'>
							<Link
								href='/'
								className='text-decoration-none me-3 link-light'>
								Privacy policy
							</Link>
							<Link
								href='/'
								className='text-decoration-none link-light'>
								Terms of use
							</Link>
						</div>
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

export default Login;
