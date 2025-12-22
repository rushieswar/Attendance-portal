/**
 * Parent - View Children
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole, Student } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

interface StudentWithClass extends Student {
	class?: {
		name: string;
		grade_level: string;
	};
}

const ChildrenPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [children, setChildren] = useState<StudentWithClass[]>([]);
	const [loadingData, setLoadingData] = useState(true);

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
					.select(`
						*,
						class:classes(name, grade_level)
					`)
					.eq('parent_id', user.id);

				if (error) throw error;
				setChildren(data || []);
			} catch (error) {
				console.error('Error fetching children:', error);
				showNotification('Error', 'Failed to load children', 'danger');
			} finally {
				setLoadingData(false);
			}
		};
		fetchChildren();
	}, [user]);

	const handleViewDetails = (studentId: string) => {
		router.push(`/parent/children/${studentId}`);
	};

	if (loading || !user || role !== UserRole.PARENT) return null;

	return (
		<PageWrapper>
			<Head>
				<title>My Children - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/parent/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>My Children</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					{loadingData ? (
						<div className='col-12 text-center py-5'>Loading...</div>
					) : children.length === 0 ? (
						<div className='col-12'>
							<Card>
								<CardBody className='text-center py-5'>
									<p className='text-muted'>No children found</p>
								</CardBody>
							</Card>
						</div>
					) : (
						children.map((child) => (
							<div key={child.id} className='col-lg-6 col-xl-4'>
								<Card stretch>
									<CardHeader>
										<CardLabel icon='Person'>
											<CardTitle>{child.full_name}</CardTitle>
										</CardLabel>
									</CardHeader>
									<CardBody>
										<div className='mb-3'>
											<strong>Admission Number:</strong> {child.admission_number}
										</div>
										<div className='mb-3'>
											<strong>Class:</strong> {child.class?.name || 'Not Assigned'}
										</div>
										<div className='mb-3'>
											<strong>Grade Level:</strong> {child.class?.grade_level || 'N/A'}
										</div>
										<div className='mb-3'>
											<strong>Date of Birth:</strong>{' '}
											{new Date(child.date_of_birth).toLocaleDateString()}
										</div>
										<Button
											color='primary'
											isLight
											className='w-100'
											icon='Visibility'
											onClick={() => handleViewDetails(child.id)}>
											View Details
										</Button>
									</CardBody>
								</Card>
							</div>
						))
					)}
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

export default ChildrenPage;

