/**
 * Teacher - View Announcements
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
import { UserRole, Announcement } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import showNotification from '../../../components/extras/showNotification';

const AnnouncementsPage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [loadingData, setLoadingData] = useState(true);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || role !== UserRole.TEACHER)) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch announcements
	useEffect(() => {
		const fetchAnnouncements = async () => {
			if (!user) return;
			try {
				const { data, error } = await supabase
					.from('announcements')
					.select('*')
					.eq('is_published', true)
					.or('target_audience.cs.{teachers},target_audience.cs.{all}')
					.order('created_at', { ascending: false });

				if (error) throw error;
				setAnnouncements(data || []);
			} catch (error) {
				console.error('Error fetching announcements:', error);
				showNotification('Error', 'Failed to load announcements', 'danger');
			} finally {
				setLoadingData(false);
			}
		};
		fetchAnnouncements();
	}, [user]);

	if (loading || !user || role !== UserRole.TEACHER) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Announcements - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/teacher/dashboard')}>
						Back to Dashboard
					</Button>
					<span className='h4 mb-0 fw-bold'>Announcements</span>
				</SubHeaderLeft>
			</SubHeader>
			<Page container='fluid'>
				<div className='row'>
					<div className='col-12'>
						{loadingData ? (
							<div className='text-center py-5'>Loading...</div>
						) : announcements.length === 0 ? (
							<Card>
								<CardBody className='text-center py-5'>
									<p className='text-muted'>No announcements available</p>
								</CardBody>
							</Card>
						) : (
							announcements.map((announcement) => (
								<Card key={announcement.id} className='mb-3'>
									<CardHeader>
										<CardLabel icon='Campaign'>
											<CardTitle>{announcement.title}</CardTitle>
										</CardLabel>
										<small className='text-muted'>
											{new Date(announcement.created_at).toLocaleDateString()}
										</small>
									</CardHeader>
									<CardBody>
										<p className='mb-0'>{announcement.content}</p>
									</CardBody>
								</Card>
							))
						)}
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

export default AnnouncementsPage;

