/**
 * Unauthorized Access Page
 * Displayed when a user tries to access a page they don't have permission for
 */

import React from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../layout/PageWrapper/PageWrapper';
import Page from '../layout/Page/Page';
import Button from '../components/bootstrap/Button';
import Icon from '../components/icon/Icon';
import { useAuth } from '../lib/auth/useAuth';
import { UserRole } from '../lib/types/database';

const Unauthorized: NextPage = () => {
	const router = useRouter();
	const { user, role } = useAuth();

	const handleGoToDashboard = () => {
		// Redirect to appropriate dashboard based on role
		switch (role) {
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
				router.push('/auth-pages/login');
		}
	};

	return (
		<PageWrapper>
			<Head>
				<title>Unauthorized Access - School Management System</title>
			</Head>
			<Page>
				<div className='row d-flex align-items-center h-100'>
					<div className='col-12 d-flex flex-column justify-content-center align-items-center'>
						<div
							className='text-primary fw-bold'
							style={{ fontSize: 'calc(3rem + 3vw)' }}>
							<Icon icon='Block' size='5x' color='danger' />
						</div>
						<div
							className='text-dark fw-bold'
							style={{ fontSize: 'calc(1.5rem + 1.5vw)' }}>
							403 - Unauthorized Access
						</div>
						<div className='text-muted' style={{ fontSize: 'calc(1rem + 1vw)' }}>
							You don't have permission to access this page
						</div>
						<div className='mt-5'>
							{user ? (
								<Button
									color='primary'
									size='lg'
									icon='Dashboard'
									onClick={handleGoToDashboard}>
									Go to Dashboard
								</Button>
							) : (
								<Button
									color='primary'
									size='lg'
									icon='Login'
									onClick={() => router.push('/auth-pages/login')}>
									Go to Login
								</Button>
							)}
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

export default Unauthorized;

